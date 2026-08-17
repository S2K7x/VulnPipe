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

import { STEP_ORDER, STEP_TRANSLATIONS, type StepName } from '../lib/step_translations.ts';

export function StepExplanation({ step }: { step: StepName }) {
  const translation = STEP_TRANSLATIONS[step];
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
  const [open, setOpen] = useState(false);
  return (
    <div className="vp-explain-inline">
      <button type="button" className="vp-link" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? 'Masquer' : 'À quoi ça sert ?'}
      </button>
      {open && <StepExplanation step={step} />}
    </div>
  );
}

export function PipelineExplainer({ currentStep }: { currentStep?: StepName }) {
  return (
    <section className="vp-pipeline-explainer" aria-label="Comment fonctionne l'analyse">
      <h2>Comment on s'y prend</h2>
      <p className="vp-pipeline-intro">
        Ton code passe par sept étapes. Aucune ne demande de compétence technique de ta part : tu peux
        suivre l'avancement et lire le résultat sans jamais ouvrir un fichier.
      </p>

      <ol className="vp-pipeline-steps">
        {STEP_ORDER.map((step, index) => {
          const translation = STEP_TRANSLATIONS[step];
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
                {isCurrent && <span className="vp-pipeline-now">en cours</span>}
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
        <h3>Pourquoi ça ne coûte presque rien</h3>
        <p>
          La plupart des adresses de ton application sont tranchées par des vérifications automatiques
          gratuites. Seuls les cas réellement douteux sont soumis à une intelligence artificielle, et
          seuls les plus ambigus vont jusqu'à la seconde relecture, plus coûteuse. Tu vois le détail
          exact de ce qui a été consommé à la fin de chaque analyse.
        </p>
      </aside>
    </section>
  );
}
