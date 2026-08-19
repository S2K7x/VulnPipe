/**
 * Serveur HTTP : réception du webhook Git + flux d'événements pour l'UI.
 *
 * Volontairement bâti sur `node:http` plutôt qu'Express : quatre routes ne
 * justifient pas une dépendance de plus dans un MVP.
 *
 * Routes :
 *   POST /estimate      { target, mode, commit_sha? }     -> devis avant scan
 *   POST /webhook       { repo_path|target, mode, ... }   -> lance un scan
 *   GET  /runs/:id/events   flux SSE de progression (rejoue l'historique)
 *   GET  /runs/:id          état + rapport final + consommation
 *   GET  /providers         fournisseurs disponibles (sélecteur de l'UI)
 *   POST /providers         change le fournisseur actif
 *   GET  /settings          réglages d'analyse (arbitrage) + seuils
 *   POST /settings          change un réglage d'analyse
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';

import {
  createLlmClient,
  describeProviders,
  parseEffort,
  SUPPORTED_PROVIDERS,
  type ProviderName,
} from '../nodes/shared/llm/factory.ts';
import { LlmError, type EffortLevel, type LlmClient } from '../nodes/shared/llm/types.ts';
import { DIRECT_ALERT_ABOVE, REJECT_BELOW } from '../aggregator/aggregator.ts';
import { StepEmitter, type StepEvent } from './step-events.ts';
import { UsageTracker } from './usage-tracker.ts';
import { InMemoryArbitrationCache } from '../master/arbitration-cache.ts';
import { runScan, selectRoutes, type PreparedScan, type ScanMode, type ScanRequest, type ScanResult } from './pipeline.ts';
import { estimateScan, prepareTarget, type ScanEstimate } from './estimator.ts';
import { resolveTarget, TargetError } from './scan-target.ts';
import { normalizeLocale, type Locale } from '../i18n/locale.ts';
import { messages } from '../i18n/messages.ts';
import type { JobQueue } from './queue.ts';

/**
 * Durée de vie d'un devis, en millisecondes.
 *
 * Un devis retient des ressources : l'index en mémoire et, pour un dépôt
 * GitHub, un clone sur le disque. Sans expiration, un utilisateur qui demande
 * dix devis puis ferme son navigateur laisse dix clones derrière lui.
 */
const ESTIMATE_TTL_MS = 15 * 60 * 1000;

export interface RunState {
  run_id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  events: StepEvent[];
  result: ScanResult | null;
  error: string | null;
  /** Devis accepté au lancement, pour comparer promesse et réalité. */
  estimate: ScanEstimate | null;
}

interface StoredEstimate {
  id: string;
  estimate: ScanEstimate;
  prepared: PreparedScan;
  expiresAt: number;
  /** true dès qu'un scan a consommé ce devis : il ne sera pas repris. */
  claimed: boolean;
}

/**
 * Configuration modifiable à chaud des fournisseurs.
 *
 * Répond à la demande « pouvoir switch les providers facilement » : le choix
 * ne vit plus uniquement dans les variables d'environnement au démarrage, il
 * est modifiable depuis l'interface, sans redémarrer le serveur.
 */
export interface ProviderSettings {
  nodeProvider: ProviderName;
  nodeModel?: string;
  /** Profondeur de raisonnement des détecteurs. Absent = défaut du modèle. */
  nodeEffort?: EffortLevel;
  masterProvider: ProviderName;
  masterModel?: string;
  /** Profondeur de raisonnement de l'arbitre. Absent = défaut du modèle. */
  masterEffort?: EffortLevel;
}

/**
 * Réglages d'analyse modifiables à chaud, distincts du choix des moteurs.
 *
 * Ils vivent sur le serveur et non dans le navigateur : ils changent ce que la
 * pipeline FAIT (et ce qu'elle facture), pas la façon dont l'écran l'affiche.
 * Deux onglets ouverts sur la même machine doivent lancer des scans réglés à
 * l'identique.
 */
export interface ScanSettings {
  /** Remonte les findings > 0.7 sans arbitrage Claude (CLAUDE.md §3). */
  bypassClaudeForHighConfidence: boolean;
}

export interface ServerOptions {
  queue: JobQueue<ScanRequest & { run_id: string; estimate_id?: string }>;
  settings?: Partial<ProviderSettings>;
  scanSettings?: Partial<ScanSettings>;
  env?: NodeJS.ProcessEnv;
}

export function createVulnPipeServer(options: ServerOptions) {
  const env = options.env ?? process.env;
  const runs = new Map<string, RunState>();
  // Un seul cache pour tout le serveur : son intérêt est justement de survivre
  // d'un scan au suivant. Il disparaît au redémarrage, comme l'état des runs.
  const arbitrationCache = new InMemoryArbitrationCache();
  const emitters = new Map<string, StepEmitter>();

  const settings: ProviderSettings = {
    nodeProvider: (options.settings?.nodeProvider ?? env.VULNPIPE_LLM_PROVIDER ?? 'gemini') as ProviderName,
    nodeModel: options.settings?.nodeModel ?? env.VULNPIPE_LLM_MODEL,
    nodeEffort: options.settings?.nodeEffort ?? parseEffort(env.VULNPIPE_LLM_EFFORT),
    masterProvider: (options.settings?.masterProvider ??
      env.VULNPIPE_MASTER_PROVIDER ??
      'anthropic') as ProviderName,
    masterModel: options.settings?.masterModel ?? env.VULNPIPE_MASTER_MODEL,
    masterEffort: options.settings?.masterEffort ?? parseEffort(env.VULNPIPE_MASTER_EFFORT),
  };

  const scanSettings: ScanSettings = {
    bypassClaudeForHighConfidence:
      options.scanSettings?.bypassClaudeForHighConfidence ??
      env.VULNPIPE_BYPASS_MASTER === 'true',
  };

  /** Indique quels fournisseurs sont réellement utilisables (clé présente). */
  const providerAvailability = (locale: Locale = 'en') => describeProviders(env as never, locale);

  /**
   * Repli sur un fournisseur utilisable si le réglage par défaut n'a pas sa clé.
   *
   * Sans ça, la configuration livrée (arbitre = anthropic) faisait échouer tout
   * scan sur une machine sans `ANTHROPIC_API_KEY` — et l'échec ne survenait
   * qu'après avoir déjà payé toute la phase de détection. Mieux vaut basculer
   * sur ce qui marche et l'écrire, que planter au milieu.
   */
  /**
   * Repli de fournisseur : on retient CE QUI a été remplacé, pas la phrase.
   *
   * La note est rendue à la demande, dans la langue de l'appelant — la
   * stocker déjà traduite la figerait dans la langue du premier démarrage.
   */
  const fallbacks: Array<{ role: 'detection' | 'arbitration'; wanted: string; used: string }> = [];
  const notesFor = (locale: Locale): string[] =>
    fallbacks.map((f) => messages(locale).providers.fallback(f.role, f.wanted, f.used));
  {
    const availability = providerAvailability();
    const usable = (id: ProviderName): boolean =>
      availability.find((entry) => entry.id === id)?.available === true;
    const firstUsable = availability.find((entry) => entry.available)?.id;

    for (const role of ['nodeProvider', 'masterProvider'] as const) {
      if (usable(settings[role]) || !firstUsable) continue;
      const wanted = settings[role];
      settings[role] = firstUsable;
      fallbacks.push({
        role: role === 'nodeProvider' ? 'detection' : 'arbitration',
        wanted,
        used: firstUsable,
      });
    }
  }

  function buildClient(provider: ProviderName, model?: string, effort?: EffortLevel): LlmClient {
    return createLlmClient({
      ...env,
      VULNPIPE_LLM_PROVIDER: provider,
      VULNPIPE_LLM_MODEL: model,
      VULNPIPE_LLM_EFFORT: effort,
    } as never);
  }

  // --- Devis en attente ------------------------------------------------------
  const estimates = new Map<string, StoredEstimate>();

  const releaseEstimate = async (stored: StoredEstimate): Promise<void> => {
    estimates.delete(stored.id);
    await stored.prepared.close().catch(() => {});
    await stored.prepared.target.cleanup().catch(() => {});
  };

  const sweepEstimates = async (): Promise<void> => {
    const now = Date.now();
    for (const stored of [...estimates.values()]) {
      if (!stored.claimed && stored.expiresAt <= now) await releaseEstimate(stored);
    }
  };

  // `unref` : ce minuteur ne doit jamais empêcher le process de s'arrêter.
  const sweeper = setInterval(() => void sweepEstimates(), 60_000);
  sweeper.unref?.();

  // --- Traitement des jobs ---------------------------------------------------
  options.queue.process(async (payload) => {
    const state = runs.get(payload.run_id)!;
    state.status = 'running';
    const emitter = emitters.get(payload.run_id)!;

    const stored = payload.estimate_id ? estimates.get(payload.estimate_id) : undefined;

    try {
      const result = await runScan(payload, {
        nodeLlm: buildClient(settings.nodeProvider, settings.nodeModel, settings.nodeEffort),
        masterLlm: buildClient(settings.masterProvider, settings.masterModel, settings.masterEffort),
        emitter,
        tracker: new UsageTracker(),
        prepared: stored?.prepared,
        bypassClaudeForHighConfidence: scanSettings.bypassClaudeForHighConfidence,
        arbitrationCache,
      });
      state.result = result;
      state.status = 'done';
    } catch (error) {
      state.status = 'failed';
      state.error = (error as Error).message;
      // Un scan qui plante doit se voir dans la timeline, pas seulement
      // dans les logs serveur.
      emitter.emit('report', 'failed', messages(payload.locale ?? 'en').scan.interrupted, {
        detail: state.error,
      });
    } finally {
      // Le devis a servi : on rend le clone temporaire et l'index, que le scan
      // ait réussi ou non.
      if (stored) await releaseEstimate(stored);
    }
  });

  // --- Utilitaires HTTP ------------------------------------------------------
  const json = (res: ServerResponse, status: number, body: unknown): void => {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    });
    res.end(payload);
  };

  const readBody = async (req: IncomingMessage): Promise<unknown> => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    if (chunks.length === 0) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new Error('invalid JSON request body');
    }
  };

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
      });
      res.end();
      return;
    }

    /**
     * Lecture commune des paramètres de cible.
     *
     * `/estimate` et `/webhook` acceptent exactement les mêmes entrées : le
     * devis doit porter sur ce qui sera réellement analysé, sinon il ne vaut
     * rien. `target` est le nom clair ; `repo_path` reste accepté pour ne pas
     * casser les webhooks Git déjà configurés.
     */
    const readTargetInput = (
      body: Record<string, unknown>
    ):
      | { target: string; mode: ScanMode; commitSha?: string; locale: Locale }
      | { error: string; friendly: string; locale: Locale } => {
      // La langue est lue en premier : même un refus doit être écrit dans la
      // langue de celui qui le lit.
      const locale = normalizeLocale(body.locale ?? body.lang);
      const t = messages(locale).api;
      const target = (body.target ?? body.repo_path) as unknown;
      const mode = (body.mode ?? 'full_scan') as ScanMode;

      if (typeof target !== 'string' || target.trim().length === 0) {
        return { error: 'missing target (target / repo_path)', friendly: t.targetMissing, locale };
      }
      if (mode !== 'full_scan' && mode !== 'incremental_scan') {
        return { error: `unknown mode: ${String(mode)}`, friendly: t.unknownMode, locale };
      }
      return {
        target: target.trim(),
        mode,
        locale,
        commitSha: typeof body.commit_sha === 'string' && body.commit_sha ? body.commit_sha : undefined,
      };
    };

    // POST /estimate — ce que l'analyse va coûter, AVANT de la lancer.
    if (req.method === 'POST' && url.pathname === '/estimate') {
      let body: Record<string, unknown>;
      try {
        body = (await readBody(req)) as Record<string, unknown>;
      } catch (error) {
        json(res, 400, { error: (error as Error).message });
        return;
      }

      const input = readTargetInput(body);
      if ('error' in input) {
        json(res, 400, { error: input.error, plain_language_summary: input.friendly });
        return;
      }

      let prepared: PreparedScan;
      try {
        const target = await resolveTarget(input.target, { locale: input.locale });
        const ready = await prepareTarget(target);
        prepared = { target, ...ready };
      } catch (error) {
        json(res, 400, {
          error: (error as Error).message,
          plain_language_summary:
            error instanceof TargetError
              ? error.plainLanguageSummary
              : messages(input.locale).api.targetUnreadable,
        });
        return;
      }

      try {
        // Le devis porte sur les routes du MODE demandé : estimer un scan
        // complet quand l'utilisateur va lancer un incrémental annoncerait
        // une facture dix fois trop élevée, et l'inverse serait pire.
        const selection = selectRoutes(
          prepared.routes,
          { repo_path: input.target, mode: input.mode, commit_sha: input.commitSha },
          prepared.index,
          prepared.target.indexRoot,
          input.locale
        );

        const estimate = await estimateScan({
          target: prepared.target,
          mode: selection.effectiveMode,
          routes: selection.routes,
          index: prepared.index,
          provider: prepared.provider,
          detection: { provider: settings.nodeProvider, model: settings.nodeModel },
          arbitration: { provider: settings.masterProvider, model: settings.masterModel },
          env: env as NodeJS.ProcessEnv,
          locale: input.locale,
        });

        if (selection.note) estimate.warnings.unshift(selection.note);

        const id = `est-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        estimates.set(id, {
          id,
          estimate,
          prepared,
          expiresAt: Date.now() + ESTIMATE_TTL_MS,
          claimed: false,
        });

        json(res, 200, {
          estimate_id: id,
          expires_in_s: Math.round(ESTIMATE_TTL_MS / 1000),
          estimate,
          notes: notesFor(input.locale),
        });
      } catch (error) {
        // Un devis qui échoue ne doit pas laisser un clone derrière lui.
        await prepared.close().catch(() => {});
        await prepared.target.cleanup().catch(() => {});
        json(res, 500, {
          error: (error as Error).message,
          plain_language_summary: messages(input.locale).api.estimateFailed,
        });
      }
      return;
    }

    // POST /webhook
    if (req.method === 'POST' && url.pathname === '/webhook') {
      let body: Record<string, unknown>;
      try {
        body = (await readBody(req)) as Record<string, unknown>;
      } catch (error) {
        json(res, 400, { error: (error as Error).message });
        return;
      }

      const input = readTargetInput(body);
      if ('error' in input) {
        json(res, 400, { error: input.error, plain_language_summary: input.friendly });
        return;
      }

      // Devis accepté : on réutilise le travail déjà fait (index, clone) au
      // lieu de tout recommencer.
      const estimateId = typeof body.estimate_id === 'string' ? body.estimate_id : undefined;
      const stored = estimateId ? estimates.get(estimateId) : undefined;
      if (estimateId && !stored) {
        json(res, 409, {
          error: `unknown or expired estimate: ${estimateId}`,
          plain_language_summary: messages(input.locale).api.estimateExpired,
        });
        return;
      }
      if (stored) stored.claimed = true;

      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const emitter = new StepEmitter(runId);
      const state: RunState = {
        run_id: runId,
        status: 'queued',
        events: [],
        result: null,
        error: null,
        estimate: stored?.estimate ?? null,
      };
      emitter.on((event) => state.events.push(event));
      runs.set(runId, state);
      emitters.set(runId, emitter);

      await options.queue.add({
        run_id: runId,
        repo_path: input.target,
        commit_sha: input.commitSha,
        mode: input.mode,
        locale: input.locale,
        estimate_id: stored?.id,
      });

      json(res, 202, {
        run_id: runId,
        events_url: `/runs/${runId}/events`,
        estimate: stored?.estimate ?? null,
        notes: notesFor(input.locale),
        plain_language_summary: messages(input.locale).api.scanStarted,
      });
      return;
    }

    // GET /runs/:id/events  (SSE)
    const eventsMatch = /^\/runs\/([^/]+)\/events$/.exec(url.pathname);
    if (req.method === 'GET' && eventsMatch) {
      const runId = eventsMatch[1]!;
      const emitter = emitters.get(runId);
      const state = runs.get(runId);
      if (!emitter || !state) {
        json(res, 404, { error: 'unknown run' });
        return;
      }

      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
        'access-control-allow-origin': '*',
      });

      // Rejoue l'historique : un client qui se branche en cours de scan ne
      // doit pas rater le début de la timeline.
      for (const event of emitter.getHistory()) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      if (state.status === 'done' || state.status === 'failed') {
        res.write(`event: end\ndata: ${JSON.stringify({ status: state.status })}\n\n`);
        res.end();
        return;
      }

      const unsubscribe = emitter.on((event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.step === 'report' && (event.status === 'done' || event.status === 'failed')) {
          res.write(`event: end\ndata: ${JSON.stringify({ status: event.status })}\n\n`);
          res.end();
        }
      });
      req.on('close', unsubscribe);
      return;
    }

    // GET /runs/:id
    const runMatch = /^\/runs\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && runMatch) {
      const state = runs.get(runMatch[1]!);
      if (!state) {
        json(res, 404, { error: 'unknown run' });
        return;
      }
      json(res, 200, {
        run_id: state.run_id,
        status: state.status,
        events: state.events,
        error: state.error,
        estimate: state.estimate,
        target: state.result?.target ?? null,
        report: state.result?.report ?? null,
        usage: state.result?.usage ?? null,
        effective_mode: state.result?.effective_mode ?? null,
        routes_analyzed: state.result?.routes_analyzed ?? null,
        routes_failed: state.result?.routes_failed ?? null,
      });
      return;
    }

    // GET /providers  — pour le sélecteur de l'UI
    if (req.method === 'GET' && url.pathname === '/providers') {
      const locale = normalizeLocale(url.searchParams.get('locale'));
      json(res, 200, {
        settings,
        available: providerAvailability(locale),
        notes: notesFor(locale),
      });
      return;
    }

    // POST /providers — bascule à chaud
    if (req.method === 'POST' && url.pathname === '/providers') {
      let body: Partial<ProviderSettings> & { locale?: string };
      try {
        body = (await readBody(req)) as Partial<ProviderSettings>;
      } catch (error) {
        json(res, 400, { error: (error as Error).message });
        return;
      }

      const locale = normalizeLocale(body.locale);
      const t = messages(locale).providers;

      for (const key of ['nodeProvider', 'masterProvider'] as const) {
        const value = body[key];
        if (value && !SUPPORTED_PROVIDERS.includes(value)) {
          json(res, 400, { error: `unknown provider: ${value}`, plain_language_summary: t.unknownProvider(value) });
          return;
        }
      }

      // Un niveau d'effort inconnu est REFUSÉ plutôt qu'ignoré : ici la
      // personne l'a posé explicitement, l'avaler en silence lui ferait croire
      // à un réglage appliqué qui ne l'est pas.
      for (const key of ['nodeEffort', 'masterEffort'] as const) {
        const value = body[key] as string | undefined;
        if (value !== undefined && value !== null && parseEffort(value) === undefined) {
          json(res, 400, {
            error: `unknown effort level: ${value}`,
            plain_language_summary: t.unknownEffort(String(value)),
          });
          return;
        }
      }

      const next: ProviderSettings = { ...settings, ...body, locale: undefined } as ProviderSettings;
      // On vérifie que le nouveau réglage est utilisable AVANT de l'appliquer :
      // basculer sur un fournisseur sans clé ferait échouer le scan suivant
      // avec un message incompréhensible.
      //
      // La vérification passe par `describeProviders` et NON par une
      // construction de client : le SDK Anthropic se construit sans clé et
      // n'échoue qu'à l'appel, ce qui laissait passer une bascule vouée à
      // planter en plein scan.
      const availability = providerAvailability(locale);
      const blocked = [next.nodeProvider, next.masterProvider]
        .map((id) => availability.find((entry) => entry.id === id))
        .find((entry) => entry && !entry.available);

      if (blocked) {
        json(res, 400, { error: blocked.why, plain_language_summary: t.unusable });
        return;
      }

      try {
        buildClient(next.nodeProvider, next.nodeModel, next.nodeEffort);
        buildClient(next.masterProvider, next.masterModel, next.masterEffort);
      } catch (error) {
        json(res, 400, {
          error: (error as Error).message,
          plain_language_summary: t.invalidSetting,
        });
        return;
      }

      Object.assign(settings, next);
      json(res, 200, { settings, available: providerAvailability(locale), notes: notesFor(locale) });
      return;
    }

    // GET /settings — réglages d'analyse + seuils appliqués
    if (req.method === 'GET' && url.pathname === '/settings') {
      json(res, 200, {
        settings: scanSettings,
        thresholds: { reject_below: REJECT_BELOW, direct_alert_above: DIRECT_ALERT_ABOVE },
      });
      return;
    }

    // POST /settings — bascule à chaud
    if (req.method === 'POST' && url.pathname === '/settings') {
      let body: Partial<ScanSettings>;
      try {
        body = (await readBody(req)) as Partial<ScanSettings>;
      } catch (error) {
        json(res, 400, { error: (error as Error).message });
        return;
      }

      if (
        body.bypassClaudeForHighConfidence !== undefined &&
        typeof body.bypassClaudeForHighConfidence !== 'boolean'
      ) {
        const locale = normalizeLocale((body as { locale?: string }).locale);
        json(res, 400, {
          error: 'bypassClaudeForHighConfidence must be a boolean',
          plain_language_summary: messages(locale).providers.invalidSetting,
        });
        return;
      }

      if (body.bypassClaudeForHighConfidence !== undefined) {
        scanSettings.bypassClaudeForHighConfidence = body.bypassClaudeForHighConfidence;
      }

      json(res, 200, {
        settings: scanSettings,
        thresholds: { reject_below: REJECT_BELOW, direct_alert_above: DIRECT_ALERT_ABOVE },
      });
      return;
    }

    json(res, 404, { error: 'unknown route' });
  };

  const server = createHttpServer((req, res) => {
    handler(req, res).catch((error) => {
      json(res, 500, { error: (error as Error).message });
    });
  });

  return {
    server,
    runs,
    emitters,
    settings,
    scanSettings,
    providerAvailability,
    handler,
    notesFor,
    estimates,
    arbitrationCache,
  };
}
