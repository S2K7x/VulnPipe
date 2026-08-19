/**
 * Page de présentation.
 *
 * ============================================================================
 * CE QU'ELLE DOIT FAIRE, ET CE QU'ELLE NE DOIT PAS FAIRE
 *
 * Le public visé — quelqu'un qui livre du code écrit avec une IA sans bagage
 * sécurité — n'arrive pas en sachant ce qu'est un IDOR, ni pourquoi un outil
 * de sécurité coûterait cher. Deux questions le retiennent avant d'essayer :
 * « qu'est-ce que ça fait de mon code ? » et « combien ça va me coûter ? ».
 * Cette page répond aux deux avant de proposer quoi que ce soit.
 *
 * Elle ne doit PAS être un argumentaire décoratif. Chaque section correspond à
 * un mécanisme réel de la pipeline, et les figures montrent le vrai découpage
 * (indexeur → contexte → détecteurs → filtre → arbitre), pas une version
 * simplifiée qui mentirait.
 *
 * Les sept étapes ne sont pas réécrites ici : elles viennent du même catalogue
 * que la timeline affichée pendant un scan. Une promesse et un compte rendu
 * qui divergent, c'est une promesse qu'on ne peut plus vérifier.
 * ============================================================================
 */

import { useI18n } from '../i18n/context.tsx';
import { STEP_ORDER, stepTranslations } from '../lib/step_translations.ts';
import { Icon } from './Icon.tsx';
import { ArchitectureDiagram, ConfidenceZones, CostFunnel } from './Diagrams.tsx';

export interface LandingPageProps {
  /** Emmène vers le lanceur d'analyse. */
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const { locale, t } = useI18n();
  const l = t.landing;
  const steps = stepTranslations(locale);

  return (
    <div className="vp-landing">
      {/* --- Ouverture ------------------------------------------------------ */}
      <section className="vp-hero vp-landing-hero">
        <span className="vp-kicker">{l.kicker}</span>
        <h1>
          {l.title}
          <br />
          <em>{l.titleEm}</em>
        </h1>
        <p className="vp-hero-lede">{l.lede}</p>

        <div className="vp-cta-row">
          <button type="button" className="vp-primary" onClick={onStart}>
            {l.ctaPrimary}
            <Icon name="arrow-right" size={16} />
          </button>
          <a className="vp-secondary vp-cta-link" href="#vp-how">
            {l.ctaSecondary}
            <Icon name="arrow-down" size={16} />
          </a>
        </div>

        <ul className="vp-stat-row">
          {l.stats.map((stat) => (
            <li key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Le problème ---------------------------------------------------- */}
      <section className="vp-section">
        <span className="vp-kicker">{l.problemKicker}</span>
        <h2>{l.problemTitle}</h2>
        <p className="vp-section-lede">{l.problemLede}</p>
        <div className="vp-card-grid">
          {l.problems.map((problem, index) => (
            <article key={problem.title} className="vp-card">
              <span className="vp-card-num">{String(index + 1).padStart(2, '0')}</span>
              <h3>{problem.title}</h3>
              <p>{problem.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* --- Architecture --------------------------------------------------- */}
      <section className="vp-section" id="vp-how">
        <span className="vp-kicker">{l.flowKicker}</span>
        <h2>{l.flowTitle}</h2>
        <p className="vp-section-lede">{l.flowLede}</p>
        <figure className="vp-schema">
          <div className="vp-schema-scroll">
            <ArchitectureDiagram labels={l.diagram} />
          </div>
          <figcaption>{l.flowCaption}</figcaption>
        </figure>
      </section>

      {/* --- Les sept étapes ------------------------------------------------ */}
      <section className="vp-section">
        <span className="vp-kicker">{l.stepsKicker}</span>
        <h2>{l.stepsTitle}</h2>
        <p className="vp-section-lede">{l.stepsLede}</p>
        <ol className="vp-landing-steps">
          {STEP_ORDER.map((step, index) => {
            const translation = steps[step];
            return (
              <li key={step}>
                <div className="vp-landing-step-head">
                  <span className="vp-landing-step-num">{String(index + 1).padStart(2, '0')}</span>
                  <span className="vp-step-icon">
                    <Icon name={translation.icon} size={20} />
                  </span>
                  <strong>{translation.label}</strong>
                </div>
                <p className="vp-explain-why">{translation.why}</p>
                <p className="vp-explain-analogy">
                  <Icon name="bulb" size={15} />
                  {translation.analogy}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* --- Zones de confiance --------------------------------------------- */}
      <section className="vp-section">
        <span className="vp-kicker">{l.zonesKicker}</span>
        <h2>{l.zonesTitle}</h2>
        <p className="vp-section-lede">{l.zonesLede}</p>
        <figure className="vp-schema">
          <div className="vp-schema-scroll">
            <ConfidenceZones zones={l.zones} />
          </div>
        </figure>
        <div className="vp-card-grid">
          {l.zones.map((zone) => (
            <article key={zone.range} className={`vp-card vp-tone-${zone.tone}`}>
              <span className="vp-card-range">{zone.range}</span>
              <h3>{zone.title}</h3>
              <p>{zone.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* --- Modèle économique ---------------------------------------------- */}
      <section className="vp-section">
        <span className="vp-kicker">{l.costKicker}</span>
        <h2>{l.costTitle}</h2>
        <p className="vp-section-lede">{l.costLede}</p>
        <figure className="vp-schema">
          <CostFunnel steps={l.funnel} />
        </figure>
        <div className="vp-card-grid">
          {l.costPoints.map((point) => (
            <article key={point.title} className="vp-card">
              <Icon name="coins" size={20} />
              <h3>{point.title}</h3>
              <p>{point.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* --- Couverture ------------------------------------------------------ */}
      <section className="vp-section">
        <span className="vp-kicker">{l.coverageKicker}</span>
        <h2>{l.coverageTitle}</h2>
        <p className="vp-section-lede">{l.coverageLede}</p>
        <div className="vp-table-scroll">
          <table className="vp-table">
            <thead>
              <tr>
                <th scope="col">{l.coverageColumns.name}</th>
                <th scope="col">{l.coverageColumns.what}</th>
                <th scope="col">{l.coverageColumns.status}</th>
              </tr>
            </thead>
            <tbody>
              {l.coverage.map((row) => (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  <td>{row.what}</td>
                  <td>
                    <span className={row.live ? 'vp-pill vp-pill-live' : 'vp-pill'}>
                      <Icon name={row.live ? 'check' : 'clock'} size={14} />
                      {row.live ? l.statusLive : l.statusPlanned}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Engagements ----------------------------------------------------- */}
      <section className="vp-section">
        <span className="vp-kicker">{l.rulesKicker}</span>
        <h2>{l.rulesTitle}</h2>
        <div className="vp-card-grid">
          {l.rules.map((rule) => (
            <article key={rule.title} className="vp-card">
              <Icon name="shield-check" size={20} />
              <h3>{rule.title}</h3>
              <p>{rule.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* --- FAQ -------------------------------------------------------------- */}
      <section className="vp-section">
        <span className="vp-kicker">{l.faqKicker}</span>
        <h2>{l.faqTitle}</h2>
        <div className="vp-faq">
          {l.faq.map((entry) => (
            <details key={entry.q}>
              <summary>{entry.q}</summary>
              <p>{entry.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* --- Reprise de l'appel à l'action ------------------------------------ */}
      <section className="vp-final-cta">
        <h2>{l.finalTitle}</h2>
        <p>{l.finalBody}</p>
        <button type="button" className="vp-primary" onClick={onStart}>
          {l.finalCta}
          <Icon name="arrow-right" size={16} />
        </button>
      </section>
    </div>
  );
}
