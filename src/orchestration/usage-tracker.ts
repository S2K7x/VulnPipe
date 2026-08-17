/**
 * Suivi de consommation — tokens, coût, latence, par étape et par modèle.
 *
 * Fonctionnalité demandée explicitement, et qui manquait : jusqu'ici chaque
 * phase comptait ses tokens dans son coin (le node dans `technical_detail`,
 * le master dans `arbiter`), sans vue d'ensemble. Or `CLAUDE.md` §1 fait du
 * low-cost une promesse non négociable : une promesse qu'on ne mesure pas
 * n'est pas tenable.
 *
 * Le tracker enveloppe n'importe quel `LlmClient` — il ne connaît ni le
 * fournisseur, ni le node qui l'appelle.
 */

import type { LlmClient, LlmRequest, LlmResponse } from '../nodes/shared/llm/types.ts';

export interface UsageEntry {
  /** Étape de la pipeline ayant déclenché l'appel. */
  stage: string;
  provider: string;
  /** Modèle demandé. */
  model: string;
  /** Modèle réellement servi (peut différer derrière un routeur). */
  resolved_model?: string;
  /** Fournisseur amont derrière un routeur (ex. openrouter/free -> nvidia). */
  upstream_provider?: string;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  /** Coût réel si le fournisseur le renvoie, sinon null (jamais estimé). */
  cost_usd: number | null;
  latency_ms: number;
  at: string;
}

export interface UsageTotals {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  /**
   * Somme des coûts RÉELS. `null` si aucun fournisseur ne les expose.
   *
   * On n'estime jamais à partir d'une grille tarifaire codée en dur : elle
   * serait fausse au premier changement de prix, et l'utilisateur croirait
   * à un chiffre inventé.
   */
  cost_usd: number | null;
  /** true si au moins un appel n'a pas renvoyé son coût. */
  cost_partial: boolean;
  latency_ms: number;
}

export interface UsageReport {
  totals: UsageTotals;
  by_stage: Record<string, UsageTotals>;
  by_model: Record<string, UsageTotals>;
  entries: UsageEntry[];
  plain_language_summary: string;
}

function emptyTotals(): UsageTotals {
  return {
    calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    thinking_tokens: 0,
    cost_usd: null,
    cost_partial: false,
    latency_ms: 0,
  };
}

function accumulate(totals: UsageTotals, entry: UsageEntry): void {
  totals.calls += 1;
  totals.input_tokens += entry.input_tokens;
  totals.output_tokens += entry.output_tokens;
  totals.thinking_tokens += entry.thinking_tokens;
  totals.latency_ms += entry.latency_ms;
  if (entry.cost_usd === null) totals.cost_partial = true;
  else totals.cost_usd = (totals.cost_usd ?? 0) + entry.cost_usd;
}

export class UsageTracker {
  private readonly entries: UsageEntry[] = [];

  record(stage: string, response: LlmResponse<unknown>): void {
    this.entries.push({
      stage,
      provider: response.provider,
      model: response.model,
      resolved_model: response.usage.resolved_model,
      upstream_provider: response.usage.upstream_provider,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      thinking_tokens: response.usage.thinking_tokens ?? 0,
      cost_usd: response.usage.cost_usd ?? null,
      latency_ms: response.latency_ms,
      at: new Date().toISOString(),
    });
  }

  /**
   * Enveloppe un client pour compter tous ses appels automatiquement.
   * Les nodes n'ont ainsi rien à instrumenter eux-mêmes.
   */
  wrap(client: LlmClient, stage: string): LlmClient {
    const tracker = this;
    return {
      provider: client.provider,
      model: client.model,
      async complete<T>(request: LlmRequest): Promise<LlmResponse<T>> {
        const response = await client.complete<T>(request);
        tracker.record(stage, response);
        return response;
      },
    };
  }

  report(): UsageReport {
    const totals = emptyTotals();
    const byStage: Record<string, UsageTotals> = {};
    const byModel: Record<string, UsageTotals> = {};

    for (const entry of this.entries) {
      accumulate(totals, entry);
      byStage[entry.stage] ??= emptyTotals();
      accumulate(byStage[entry.stage]!, entry);
      const modelKey = `${entry.provider}/${entry.resolved_model ?? entry.model}`;
      byModel[modelKey] ??= emptyTotals();
      accumulate(byModel[modelKey]!, entry);
    }

    return {
      totals,
      by_stage: byStage,
      by_model: byModel,
      entries: [...this.entries],
      plain_language_summary: summarize(totals, byModel),
    };
  }
}

function summarize(totals: UsageTotals, byModel: Record<string, UsageTotals>): string {
  if (totals.calls === 0) {
    return "Ce scan n'a fait appel à aucune intelligence artificielle : tout a été tranché par les vérifications automatiques, sans coût.";
  }

  const parts: string[] = [];
  const words = totals.input_tokens + totals.output_tokens + totals.thinking_tokens;
  parts.push(
    `Ce scan a demandé ${totals.calls} analyse${totals.calls > 1 ? 's' : ''} par intelligence artificielle, pour environ ${Math.round(words / 1000)} millier(s) de mots traités.`
  );

  if (totals.cost_usd !== null) {
    const shown = totals.cost_usd === 0 ? 'gratuit' : `${totals.cost_usd.toFixed(4)} $`;
    parts.push(
      totals.cost_partial
        ? `Coût connu pour une partie des appels : ${shown} (certains fournisseurs ne communiquent pas leurs prix).`
        : `Coût total : ${shown}.`
    );
  } else {
    parts.push(
      "Le coût n'est pas communiqué par le fournisseur utilisé : seul le volume traité est mesurable."
    );
  }

  // Le raisonnement interne est le poste de dépense le moins visible.
  if (totals.thinking_tokens > totals.output_tokens) {
    parts.push(
      "La majorité du travail facturé est de la réflexion interne du modèle, pas du texte produit : c'est normal, mais c'est là que part le budget."
    );
  }

  const models = Object.keys(byModel);
  if (models.length > 0) {
    parts.push(`Modèle(s) utilisé(s) : ${models.join(', ')}.`);
  }

  return parts.join(' ');
}
