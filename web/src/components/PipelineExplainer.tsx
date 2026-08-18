/**
 * Explication de la pipeline, pour quelqu'un qui ne code pas.
 *
 * C'est la pièce qui manquait : la timeline dit CE QUI se passe, pas POURQUOI.
 * Un utilisateur non technique qui voit défiler « Mise en relation » sans
 * comprendre à quoi ça sert n'a aucune raison de faire confiance au verdict
 * final. Chaque étape est donc accompagnée de son utilité et d'une analogie
 * du quotidien.
 *
 * Deux usages :
 *  - `variant="overview"` : avant le scan, pour montrer le déroulé complet.
 *  - `variant="inline"`   : pendant le scan, replié sous l'étape en cours.
 */

import { useState } from 'react';

import { STEP_ORDER, stepTranslations, type StepName } from '../lib/step_translations.ts';
import { useI18n } from '../i18n/context.tsx';

export function StepExplanation({ step }: { step: StepName }) {
  const { locale } = useI18n();
  const translation = stepTranslations(locale)[step];
  if (!translation) return null;
  return (
    <div className="vp-explain">
      <p className="vp-explain-why">{translation.why}</p>
      <p className="vp-explain-analogy">
        <span aria-hidden="true">💡 </span>
        {translation.analogy}
      </p>
    </div>
  );
}

/** Bouton « à quoi ça sert ? » replié, à glisser sous une étape. */
export function StepExplanationToggle({ step }: { step: StepName }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="vp-explain-inline">
      <button type="button" className="vp-link" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? t.explainer.hide : t.explainer.show}
      </button>
      {open && <StepExplanation step={step} />}
    </div>
  );
}

export function PipelineExplainer({ currentStep }: { currentStep?: StepName }) {
  const { locale, t } = useI18n();
  return (
    <section className="vp-pipeline-explainer" aria-label={t.explainer.title}>
      <h2>{t.explainer.intro}</h2>
      <p className="vp-pipeline-intro">{t.explainer.lede}</p>

      <ol className="vp-pipeline-steps">
        {STEP_ORDER.map((step, index) => {
          const translation = stepTranslations(locale)[step];
          const isCurrent = currentStep === step;
          return (
            <li key={step} className={isCurrent ? 'vp-pipeline-step vp-current' : 'vp-pipeline-step'}>
              <div className="vp-pipeline-head">
                <span className="vp-pipeline-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="vp-step-icon" aria-hidden="true">
                  {translation.icon}
                </span>
                <strong>{translation.label}</strong>
                {isCurrent && <span className="vp-pipeline-now">{t.explainer.now}</span>}
              </div>
              <StepExplanation step={step} />
            </li>
          );
        })}
      </ol>

      {/* Le modèle économique expliqué simplement : c'est la promesse n°1 du
          produit, elle mérite d'être dite à l'utilisateur, pas seulement
          codée. */}
      <aside className="vp-pipeline-cost">
        <h3>{t.explainer.costTitle}</h3>
        <p>{t.explainer.costBody}</p>
      </aside>
    </section>
  );
}
