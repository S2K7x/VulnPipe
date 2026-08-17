/**
 * Serveur HTTP : réception du webhook Git + flux d'événements pour l'UI.
 *
 * Volontairement bâti sur `node:http` plutôt qu'Express : quatre routes ne
 * justifient pas une dépendance de plus dans un MVP.
 *
 * Routes :
 *   POST /webhook       { repo_path, commit_sha?, mode }  -> lance un scan
 *   GET  /runs/:id/events   flux SSE de progression (rejoue l'historique)
 *   GET  /runs/:id          état + rapport final + consommation
 *   GET  /providers         fournisseurs disponibles (sélecteur de l'UI)
 *   POST /providers         change le fournisseur actif
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';

import {
  createLlmClient,
  describeProviders,
  SUPPORTED_PROVIDERS,
  type ProviderName,
} from '../nodes/shared/llm/factory.ts';
import { LlmError, type LlmClient } from '../nodes/shared/llm/types.ts';
import { StepEmitter, type StepEvent } from './step-events.ts';
import { UsageTracker } from './usage-tracker.ts';
import { runScan, type ScanMode, type ScanRequest, type ScanResult } from './pipeline.ts';
import type { JobQueue } from './queue.ts';

export interface RunState {
  run_id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  events: StepEvent[];
  result: ScanResult | null;
  error: string | null;
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
  masterProvider: ProviderName;
  masterModel?: string;
}

export interface ServerOptions {
  queue: JobQueue<ScanRequest & { run_id: string }>;
  settings?: Partial<ProviderSettings>;
  env?: NodeJS.ProcessEnv;
}

export function createVulnPipeServer(options: ServerOptions) {
  const env = options.env ?? process.env;
  const runs = new Map<string, RunState>();
  const emitters = new Map<string, StepEmitter>();

  const settings: ProviderSettings = {
    nodeProvider: (options.settings?.nodeProvider ?? env.VULNPIPE_LLM_PROVIDER ?? 'gemini') as ProviderName,
    nodeModel: options.settings?.nodeModel ?? env.VULNPIPE_LLM_MODEL,
    masterProvider: (options.settings?.masterProvider ??
      env.VULNPIPE_MASTER_PROVIDER ??
      'anthropic') as ProviderName,
    masterModel: options.settings?.masterModel ?? env.VULNPIPE_MASTER_MODEL,
  };

  /** Indique quels fournisseurs sont réellement utilisables (clé présente). */
  const providerAvailability = () => describeProviders(env as never);

  function buildClient(provider: ProviderName, model?: string): LlmClient {
    return createLlmClient({
      ...env,
      VULNPIPE_LLM_PROVIDER: provider,
      VULNPIPE_LLM_MODEL: model,
    } as never);
  }

  // --- Traitement des jobs ---------------------------------------------------
  options.queue.process(async (payload) => {
    const state = runs.get(payload.run_id)!;
    state.status = 'running';
    const emitter = emitters.get(payload.run_id)!;

    try {
      const result = await runScan(payload, {
        nodeLlm: buildClient(settings.nodeProvider, settings.nodeModel),
        masterLlm: buildClient(settings.masterProvider, settings.masterModel),
        emitter,
        tracker: new UsageTracker(),
      });
      state.result = result;
      state.status = 'done';
    } catch (error) {
      state.status = 'failed';
      state.error = (error as Error).message;
      // Un scan qui plante doit se voir dans la timeline, pas seulement
      // dans les logs serveur.
      emitter.emit('report', 'failed', "L'analyse s'est interrompue avant de produire un rapport.", {
        detail: state.error,
      });
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
      throw new Error('corps de requête JSON invalide');
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

    // POST /webhook
    if (req.method === 'POST' && url.pathname === '/webhook') {
      let body: Record<string, unknown>;
      try {
        body = (await readBody(req)) as Record<string, unknown>;
      } catch (error) {
        json(res, 400, { error: (error as Error).message });
        return;
      }

      const repoPath = body.repo_path;
      const mode = (body.mode ?? 'full_scan') as ScanMode;

      if (typeof repoPath !== 'string' || repoPath.length === 0) {
        json(res, 400, {
          error: 'repo_path manquant',
          plain_language_summary: "Il faut indiquer le dossier du projet à analyser.",
        });
        return;
      }
      if (mode !== 'full_scan' && mode !== 'incremental_scan') {
        json(res, 400, { error: `mode inconnu : ${String(mode)}` });
        return;
      }

      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const emitter = new StepEmitter(runId);
      const state: RunState = { run_id: runId, status: 'queued', events: [], result: null, error: null };
      emitter.on((event) => state.events.push(event));
      runs.set(runId, state);
      emitters.set(runId, emitter);

      await options.queue.add({
        run_id: runId,
        repo_path: repoPath,
        commit_sha: typeof body.commit_sha === 'string' ? body.commit_sha : undefined,
        mode,
      });

      json(res, 202, {
        run_id: runId,
        events_url: `/runs/${runId}/events`,
        plain_language_summary: "Analyse lancée. Tu peux suivre son avancement en direct.",
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
        json(res, 404, { error: 'run inconnu' });
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
        json(res, 404, { error: 'run inconnu' });
        return;
      }
      json(res, 200, {
        run_id: state.run_id,
        status: state.status,
        events: state.events,
        error: state.error,
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
      json(res, 200, { settings, available: providerAvailability() });
      return;
    }

    // POST /providers — bascule à chaud
    if (req.method === 'POST' && url.pathname === '/providers') {
      let body: Partial<ProviderSettings>;
      try {
        body = (await readBody(req)) as Partial<ProviderSettings>;
      } catch (error) {
        json(res, 400, { error: (error as Error).message });
        return;
      }

      for (const key of ['nodeProvider', 'masterProvider'] as const) {
        const value = body[key];
        if (value && !SUPPORTED_PROVIDERS.includes(value)) {
          json(res, 400, { error: `fournisseur inconnu : ${value}` });
          return;
        }
      }

      const next: ProviderSettings = { ...settings, ...body };
      // On vérifie que le nouveau réglage est utilisable AVANT de l'appliquer :
      // basculer sur un fournisseur sans clé ferait échouer le scan suivant
      // avec un message incompréhensible.
      //
      // La vérification passe par `describeProviders` et NON par une
      // construction de client : le SDK Anthropic se construit sans clé et
      // n'échoue qu'à l'appel, ce qui laissait passer une bascule vouée à
      // planter en plein scan.
      const availability = providerAvailability();
      const blocked = [next.nodeProvider, next.masterProvider]
        .map((id) => availability.find((entry) => entry.id === id))
        .find((entry) => entry && !entry.available);

      if (blocked) {
        json(res, 400, {
          error: blocked.why,
          plain_language_summary:
            "Ce fournisseur n'est pas utilisable pour l'instant : il lui manque sa clé d'accès. Le réglage précédent est conservé.",
        });
        return;
      }

      try {
        buildClient(next.nodeProvider, next.nodeModel);
        buildClient(next.masterProvider, next.masterModel);
      } catch (error) {
        json(res, 400, {
          error: (error as Error).message,
          plain_language_summary:
            "Ce réglage n'est pas utilisable en l'état. Le réglage précédent est conservé.",
        });
        return;
      }

      Object.assign(settings, next);
      json(res, 200, { settings, available: providerAvailability() });
      return;
    }

    json(res, 404, { error: 'route inconnue' });
  };

  const server = createHttpServer((req, res) => {
    handler(req, res).catch((error) => {
      json(res, 500, { error: (error as Error).message });
    });
  });

  return { server, runs, emitters, settings, providerAvailability, handler };
}
