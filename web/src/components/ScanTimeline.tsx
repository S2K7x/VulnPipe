/**
 * Timeline de progression, en langage humain.
 *
 * Aucune chaîne technique n'est affichée : tout passe par
 * `step_translations.ts`. Le détail brut (nom de node, message d'erreur) n'est
 * visible que derrière un dépliant explicitement libellé.
 */

import { useMemo, useState } from 'react';

import {
  STEP_ORDER,
  STEP_TRANSLATIONS,
  translateStep,
  type StepName,
  type StepStatus,
} from '../lib/step_translations.ts';
import { StepExplanationToggle } from './PipelineExplainer.tsx';

export interface StepEvent {
  run_id: string;
  seq: number;
  step: StepName;
  status: StepStatus;
  plain_language: string;
  at: string;
  detail?: string;
  progress?: { done: number; total: number };
}

export interface ScanTimelineProps {
  events: StepEvent[];
  /** Affiche le détail technique (repliable). Faux par défaut. */
  showTechnicalDetail?: boolean;
  /**
   * Ajoute sous chaque étape un « à quoi ça sert ? » replié.
   *
   * C'est ce qui distingue une barre de progression d'une explication : sans
   * ça, un utilisateur non technique voit défiler des étiquettes sans savoir
   * ce qui est vérifié ni pourquoi.
   */
  showExplanations?: boolean;
  /** Étape en cours, mise en avant visuellement. */
  currentStep?: StepName | null;
}

interface StepState {
  step: StepName;
  status: StepStatus | 'pending';
  message: string;
  progress?: { done: number; total: number };
  details: string[];
}

/**
 * Réduit le flux d'événements à un état par étape.
 *
 * Trié sur `seq`, jamais sur l'ordre d'arrivée : les nodes publient en
 * parallèle et rien ne garantit que la file les livre dans l'ordre.
 *
 * Un `failed` ne peut jamais être écrasé par un `done` ultérieur — sinon une
 * étape partiellement en échec s'afficherait comme réussie, et l'utilisateur
 * croirait à une couverture complète.
 */
export function reduceEvents(events: StepEvent[]): StepState[] {
  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  const byStep = new Map<StepName, StepState>();

  for (const event of ordered) {
    const current = byStep.get(event.step);
    const failedBefore = current?.status === 'failed';

    byStep.set(event.step, {
      step: event.step,
      status: failedBefore && event.status === 'done' ? 'failed' : event.status,
      message: failedBefore && event.status === 'done' ? current!.message : event.plain_language,
      progress: event.progress ?? current?.progress,
      details: event.detail ? [...(current?.details ?? []), event.detail] : (current?.details ?? []),
    });
  }

  return STEP_ORDER.filter((step) => byStep.has(step)).map((step) => byStep.get(step)!);
}

function StatusIcon({ status }: { status: StepState['status'] }) {
  const map: Record<string, { symbol: string; label: string }> = {
    running: { symbol: '⏳', label: 'en cours' },
    done: { symbol: '✅', label: 'terminé' },
    failed: { symbol: '⚠️', label: 'problème rencontré' },
    skipped: { symbol: '⏭️', label: 'étape sautée' },
    pending: { symbol: '·', label: 'en attente' },
  };
  const entry = map[status] ?? map.pending!;
  return (
    <span className="vp-status" role="img" aria-label={entry.label} title={entry.label}>
      {entry.symbol}
    </span>
  );
}

export function ScanTimeline({
  events,
  showTechnicalDetail = false,
  showExplanations = false,
  currentStep = null,
}: ScanTimelineProps) {
  const steps = useMemo(() => reduceEvents(events), [events]);
  const [openDetails, setOpenDetails] = useState<Set<StepName>>(new Set());

  if (steps.length === 0) {
    return (
      <p className="vp-timeline-empty">
        L'analyse va démarrer. Tu verras ici, étape par étape, ce qui est en train d'être vérifié.
      </p>
    );
  }

  const toggle = (step: StepName) => {
    setOpenDetails((previous) => {
      const next = new Set(previous);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  return (
    <ol className="vp-timeline" aria-label="Avancement de l'analyse">
      {steps.map((state) => {
        const translation = STEP_TRANSLATIONS[state.step];
        const isOpen = openDetails.has(state.step);
        const isCurrent = currentStep === state.step;
        return (
          <li
            key={state.step}
            className={`vp-timeline-step vp-${state.status}${isCurrent ? ' vp-current' : ''}`}
          >
            <div className="vp-timeline-head">
              <StatusIcon status={state.status} />
              <span className="vp-step-icon" aria-hidden="true">
                {translation.icon}
              </span>
              <strong className="vp-step-label">{translation.label}</strong>
            </div>

            {/* Le message du serveur prime ; la table de traduction sert de
                repli si un événement arrive sans texte. */}
            <p className="vp-step-message">
              {state.message || translateStep(state.step, state.status as StepStatus)}
            </p>

            {state.progress && state.progress.total > 0 && (
              <div className="vp-progress">
                <progress value={state.progress.done} max={state.progress.total} />
                <span>
                  {state.progress.done} sur {state.progress.total}
                </span>
              </div>
            )}

            {showExplanations && <StepExplanationToggle step={state.step} />}

            {showTechnicalDetail && state.details.length > 0 && (
              <div className="vp-step-details">
                <button type="button" onClick={() => toggle(state.step)} aria-expanded={isOpen}>
                  {isOpen ? 'Masquer le détail technique' : 'Voir le détail technique'}
                </button>
                {isOpen && (
                  <ul>
                    {state.details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
