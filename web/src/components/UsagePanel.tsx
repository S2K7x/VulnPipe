/**
 * Panneau de consommation : tokens, coût, latence.
 *
 * Fonctionnalité demandée, absente de PHASE_6. Elle sert directement la
 * promesse n°1 de `CLAUDE.md` — le low-cost : un utilisateur qui ne voit pas
 * ce que son scan consomme ne peut pas savoir si la promesse est tenue.
 *
 * Deux principes de présentation :
 *  - Le résumé est en langage courant ; le tableau technique est REPLIÉ, comme
 *    pour les findings.
 *  - Un coût non communiqué par le fournisseur est affiché comme inconnu, pas
 *    estimé. Un chiffre inventé à partir d'une grille tarifaire codée en dur
 *    serait faux au premier changement de prix — et l'utilisateur y croirait.
 */

import { useState } from 'react';

export interface UsageTotals {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  cost_usd: number | null;
  cost_partial: boolean;
  latency_ms: number;
}

export interface UsageReport {
  totals: UsageTotals;
  by_stage: Record<string, UsageTotals>;
  by_model: Record<string, UsageTotals>;
  plain_language_summary: string;
}

const STAGE_LABELS: Record<string, string> = {
  detection: 'Recherche de failles',
  master_review: 'Seconde relecture',
};

export function formatCost(totals: UsageTotals): string {
  if (totals.cost_usd === null) return 'non communiqué par le fournisseur';
  if (totals.cost_usd === 0) return 'gratuit';
  const amount = totals.cost_usd < 0.01 ? totals.cost_usd.toFixed(4) : totals.cost_usd.toFixed(2);
  return totals.cost_partial ? `${amount} $ (partiel)` : `${amount} $`;
}

export function UsagePanel({ usage }: { usage: UsageReport }) {
  const [showDetail, setShowDetail] = useState(false);
  const { totals } = usage;

  return (
    <section className="vp-usage" aria-label="Consommation de ce scan">
      <h3>Ce que ce scan a consommé</h3>
      <p className="vp-usage-summary">{usage.plain_language_summary}</p>

      <ul className="vp-usage-highlights">
        <li>
          <span className="vp-usage-value">{totals.calls}</span>
          <span className="vp-usage-label">analyse(s) par IA</span>
        </li>
        <li>
          <span className="vp-usage-value">{formatCost(totals)}</span>
          <span className="vp-usage-label">coût</span>
        </li>
        <li>
          <span className="vp-usage-value">{Math.round(totals.latency_ms / 1000)} s</span>
          <span className="vp-usage-label">de calcul</span>
        </li>
      </ul>

      <button type="button" onClick={() => setShowDetail((open) => !open)} aria-expanded={showDetail}>
        {showDetail ? 'Masquer le détail de la consommation' : 'Voir le détail de la consommation'}
      </button>

      {showDetail && (
        <div className="vp-usage-detail">
          <table>
            <caption>Par étape</caption>
            <thead>
              <tr>
                <th scope="col">Étape</th>
                <th scope="col">Appels</th>
                <th scope="col">Entrée</th>
                <th scope="col">Sortie</th>
                <th scope="col">Réflexion</th>
                <th scope="col">Coût</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(usage.by_stage).map(([stage, stageTotals]) => (
                <tr key={stage}>
                  <th scope="row">{STAGE_LABELS[stage] ?? stage}</th>
                  <td>{stageTotals.calls}</td>
                  <td>{stageTotals.input_tokens}</td>
                  <td>{stageTotals.output_tokens}</td>
                  <td>{stageTotals.thinking_tokens}</td>
                  <td>{formatCost(stageTotals)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table>
            <caption>Par modèle</caption>
            <thead>
              <tr>
                <th scope="col">Modèle</th>
                <th scope="col">Appels</th>
                <th scope="col">Coût</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(usage.by_model).map(([model, modelTotals]) => (
                <tr key={model}>
                  <th scope="row">{model}</th>
                  <td>{modelTotals.calls}</td>
                  <td>{formatCost(modelTotals)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Le raisonnement interne est le poste le moins visible : on
              l'explique plutôt que de laisser un chiffre nu. */}
          {totals.thinking_tokens > 0 && (
            <p className="vp-usage-note">
              « Réflexion » correspond au raisonnement interne du modèle, avant qu'il ne rédige sa
              réponse. C'est facturé comme le reste, et c'est souvent le plus gros poste.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
