/**
 * Chaîne complète : Indexeur -> MCP -> Nodes (parallèle) -> Agrégateur -> Master.
 *
 * Chaque étape publie sa progression via `StepEmitter`, et tous les appels LLM
 * passent par `UsageTracker`.
 */

import { execFileSync } from 'node:child_process';
import { relative, sep } from 'node:path';

import { buildRepoIndex, type RepoIndex } from '../mcp-server/repo-index.ts';
import { createServer } from '../mcp-server/server.ts';
import { connectInProcess, type ContextProvider, type ListedRoute } from '../nodes/shared/mcp-client.ts';
import type { LlmClient } from '../nodes/shared/llm/types.ts';
import { analyzeRouteForIdor } from '../nodes/idor/node.ts';
import { aggregate, fromNodeVerdict, type NodeFinding, type AggregationResult } from '../aggregator/aggregator.ts';
import { arbitrate } from '../master/claude-client.ts';
import { buildReport, type SecurityReport } from '../master/report-builder.ts';
import { StepEmitter } from './step-events.ts';
import { UsageTracker, type UsageReport } from './usage-tracker.ts';

export type ScanMode = 'full_scan' | 'incremental_scan';

export interface ScanRequest {
  repo_path: string;
  commit_sha?: string;
  mode: ScanMode;
}

/**
 * Un détecteur enregistré.
 *
 * La spec parle de « (parallèle) Nodes de détection » au pluriel. Un seul node
 * existe aujourd'hui (IDOR, Phase 3), mais le registre et le `Promise.all`
 * sont en place : ajouter XSS ou SQLi se fera par une entrée ici, sans toucher
 * à l'orchestration.
 */
export interface DetectionNode {
  id: string;
  vulnerability: string;
  /** Phrase affichée pendant que ce node tourne — jamais son nom technique. */
  plainLanguage: string;
  analyze(
    route: ListedRoute,
    context: { provider: ContextProvider; llm: LlmClient }
  ): Promise<NodeFinding | null>;
}

export const IDOR_DETECTION_NODE: DetectionNode = {
  id: 'idor-node',
  vulnerability: 'IDOR',
  plainLanguage:
    "On vérifie que personne ne peut consulter les données d'un autre utilisateur en changeant un numéro dans l'adresse.",
  async analyze(route, { provider, llm }) {
    const verdict = await analyzeRouteForIdor(
      { route: route.route, httpMethod: route.http_method },
      { contextProvider: provider, llm }
    );
    return fromNodeVerdict(verdict, 'idor-node', route.guards);
  },
};

export interface PipelineOptions {
  nodeLlm: LlmClient;
  masterLlm: LlmClient;
  nodes?: DetectionNode[];
  emitter?: StepEmitter;
  tracker?: UsageTracker;
}

export interface ScanResult {
  run_id: string;
  mode: ScanMode;
  /** Mode réellement appliqué : un incremental peut retomber en full. */
  effective_mode: ScanMode;
  report: SecurityReport;
  usage: UsageReport;
  routes_analyzed: number;
  routes_failed: number;
  failures: string[];
  aggregation: AggregationResult;
}

/**
 * Sélectionne les routes à analyser selon le mode.
 *
 * IMPLÉMENTE `incremental_scan`, que PHASE_6 se contente d'accepter en
 * paramètre du webhook sans jamais dire quoi en faire. Or c'est la distinction
 * centrale de `CLAUDE.md` §3 : `full_scan` analyse tout, `incremental_scan`
 * ne réanalyse que les routes des fichiers modifiés — c'est le mode
 * « low-cost du quotidien », donc la tarification même du produit.
 *
 * Si le diff n'est pas calculable (dépôt non git, commit inconnu), on retombe
 * sur un scan complet et on le DIT : un incrémental silencieusement dégradé en
 * complet ferait exploser la facture sans prévenir, et l'inverse — un complet
 * dégradé en partiel — laisserait croire à une couverture qu'on n'a pas.
 */
export function selectRoutes(
  routes: ListedRoute[],
  request: ScanRequest,
  index: RepoIndex
): { routes: ListedRoute[]; effectiveMode: ScanMode; note: string | null } {
  if (request.mode === 'full_scan') {
    return { routes, effectiveMode: 'full_scan', note: null };
  }

  if (!request.commit_sha) {
    return {
      routes,
      effectiveMode: 'full_scan',
      note: "Aucun identifiant de commit fourni : impossible de savoir ce qui a changé, tout le projet a été réanalysé.",
    };
  }

  let changed: string[];
  try {
    const output = execFileSync(
      'git',
      ['diff', '--name-only', `${request.commit_sha}^`, request.commit_sha],
      { cwd: request.repo_path, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    changed = output.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return {
      routes,
      effectiveMode: 'full_scan',
      note: "Les modifications n'ont pas pu être déterminées (dépôt non versionné ou commit introuvable) : tout le projet a été réanalysé.",
    };
  }

  const changedSet = new Set(changed.map((file) => file.split(sep).join('/')));
  const rootRelative = (file: string): string =>
    relative(request.repo_path, file).split(sep).join('/');

  const selected = routes.filter((route) => {
    // `route.file` est déjà relatif à la racine indexée.
    if (changedSet.has(route.file)) return true;
    // Un service modifié rend vulnérables les routes qui l'appellent : on
    // inclut toute route dont un fichier lié a bougé.
    return [...changedSet].some((file) => index.files.some((f) => rootRelative(f) === file && f.includes(route.controller)));
  });

  return {
    routes: selected,
    effectiveMode: 'incremental_scan',
    note:
      selected.length === 0
        ? "Aucune adresse concernée par les modifications de ce commit : rien à réanalyser."
        : null,
  };
}

/** Exécute un scan de bout en bout. */
export async function runScan(request: ScanRequest, options: PipelineOptions): Promise<ScanResult> {
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const emitter = options.emitter ?? new StepEmitter(runId);
  const tracker = options.tracker ?? new UsageTracker();
  const nodes = options.nodes ?? [IDOR_DETECTION_NODE];

  const nodeLlm = tracker.wrap(options.nodeLlm, 'detection');
  const masterLlm = tracker.wrap(options.masterLlm, 'master_review');

  emitter.emit('received', 'done', "On a bien reçu ta demande d'analyse. C'est parti.");

  // --- 1. Indexation --------------------------------------------------------
  emitter.emit('indexing', 'running', "On lit la structure de ton code pour repérer toutes les pages et adresses de ton application...");
  let index: RepoIndex;
  try {
    index = buildRepoIndex(request.repo_path);
  } catch (error) {
    emitter.emit('indexing', 'failed', "On n'a pas réussi à lire ton code. L'analyse s'arrête ici.", {
      detail: (error as Error).message,
    });
    throw error;
  }
  emitter.emit('indexing', 'done', `On a trouvé ${index.endpoints.length} adresse(s) dans ton application.`);

  // --- 2. Serveur de contexte ----------------------------------------------
  emitter.emit('context_server', 'running', 'On relie les morceaux de code entre eux pour comprendre ce que chaque page fait vraiment...');
  const provider = await connectInProcess(createServer(index));
  emitter.emit('context_server', 'done', 'Les liens entre les différentes parties de ton code sont établis.');

  try {
    const allRoutes = await provider.listRoutes();
    const selection = selectRoutes(allRoutes, request, index);
    if (selection.note) {
      emitter.emit('detection', 'skipped', selection.note);
    }

    // --- 3. Détection (nodes en parallèle) ---------------------------------
    const findings: NodeFinding[] = [];
    const failures: string[] = [];
    let done = 0;

    for (const node of nodes) {
      emitter.emit('detection', 'running', node.plainLanguage, {
        detail: node.vulnerability,
        progress: { done: 0, total: selection.routes.length },
      });
    }

    for (const route of selection.routes) {
      // Les nodes tournent en parallèle sur une même route : ils sont
      // indépendants et n'ont aucune raison de s'attendre.
      const results = await Promise.allSettled(
        nodes.map((node) => node.analyze(route, { provider, llm: nodeLlm }))
      );

      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          if (result.value) findings.push(result.value);
        } else {
          const message = `${nodes[i]!.vulnerability} sur ${route.http_method} ${route.route} : ${result.reason?.message ?? result.reason}`;
          failures.push(message);
          // Une route non analysée n'est PAS une route saine : elle est
          // annoncée comme un échec, jamais passée sous silence.
          emitter.emit('detection', 'failed', `Une adresse n'a pas pu être vérifiée : ${route.http_method} ${route.route}.`, {
            detail: message,
          });
        }
      });

      done += 1;
      emitter.emit('detection', 'running', node_progress(done, selection.routes.length), {
        progress: { done, total: selection.routes.length },
      });
    }

    emitter.emit(
      'detection',
      failures.length > 0 ? 'failed' : 'done',
      failures.length > 0
        ? `Vérification terminée, mais ${failures.length} adresse(s) n'ont pas pu être analysées.`
        : 'Toutes les adresses de ton application ont été vérifiées.'
    );

    // --- 4. Agrégation ------------------------------------------------------
    emitter.emit('aggregation', 'running', 'On regroupe les signalements, on écarte les doublons et les fausses pistes évidentes...');
    const aggregation = aggregate(findings, { routesAnalyzed: selection.routes.length });
    const candidates = [...aggregation.claude_payload, ...aggregation.direct_alerts];
    emitter.emit(
      'aggregation',
      'done',
      `${aggregation.stats.rejected_low_confidence} signalement(s) sans danger écarté(s), ${candidates.length} à faire relire.`
    );

    // --- 5. Arbitrage master -------------------------------------------------
    emitter.emit('master_review', 'running', 'Une seconde intelligence, plus poussée, relit les points restants pour éliminer les fausses alertes...');
    const outcome = await arbitrate(candidates, { llm: masterLlm, contextProvider: provider });
    emitter.emit(
      'master_review',
      outcome.unarbitrated.length > 0 ? 'failed' : 'done',
      outcome.unarbitrated.length > 0
        ? `Relecture partielle : ${outcome.unarbitrated.length} point(s) n'ont pas pu être revérifiés.`
        : 'Relecture terminée.'
    );

    // --- 6. Rapport ----------------------------------------------------------
    emitter.emit('report', 'running', 'On rédige ton rapport en français simple...');
    const report = buildReport(aggregation, outcome, {
      routesAnalyzed: selection.routes.length,
      routesFailed: failures.length,
    });
    emitter.emit('report', 'done', report.scan_summary.plain_language_intro);

    return {
      run_id: runId,
      mode: request.mode,
      effective_mode: selection.effectiveMode,
      report,
      usage: tracker.report(),
      routes_analyzed: selection.routes.length,
      routes_failed: failures.length,
      failures,
      aggregation,
    };
  } finally {
    await provider.close();
  }
}

function node_progress(done: number, total: number): string {
  return `On a vérifié ${done} adresse(s) sur ${total}.`;
}
