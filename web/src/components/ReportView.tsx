/**
 * Affichage du rapport final — « Vibe Coder Mode ».
 *
 * Règles de PHASE_6 tenues ici :
 *  - par défaut, uniquement `plain_language_summary` + badge de gravité ;
 *  - le détail technique est REPLIÉ, derrière un bouton explicite ;
 *  - aucun terme technique n'apparaît seul : chaque nom de vulnérabilité est
 *    accompagné de sa traduction (info-bulle + texte visible).
 */

import { useState } from 'react';

import { explainTerm, SEVERITY_LABELS } from '../lib/step_translations.ts';

export interface ReportFinding {
  severity: string;
  report_level: 'critical' | 'warning';
  vulnerability: string;
  route: string;
  http_method: string;
  file: string;
  line: number | null;
  claude_verdict: 'confirmed' | 'rejected' | 'needs_human_review';
  claude_reasoning: string;
  technical_summary: string;
  plain_language_summary: string;
  suggested_fix_direction: string;
  owasp_category: string;
  evidence: 'code' | 'summary_only' | 'not_arbitrated';
  local_confidence_score: number;
  detected_by: string[];
}

export interface SecurityReport {
  scan_summary: {
    total_findings: number;
    critical: number;
    warning: number;
    dismissed_by_arbiter: number;
    not_arbitrated: number;
    plain_language_intro: string;
  };
  findings: ReportFinding[];
  dismissed: Array<{ vulnerability: string; route: string; http_method: string }>;
}

/** Nom technique + sa traduction, jamais l'un sans l'autre. */
export function VulnerabilityName({ name }: { name: string }) {
  const explanation = explainTerm(name);
  if (!explanation) {
    // Terme absent du glossaire : on n'affiche PAS un sigle nu à quelqu'un qui
    // ne code pas. Mieux vaut une formulation générique qu'un mot opaque.
    return <span className="vp-vuln-name">Problème de sécurité</span>;
  }
  return (
    <span className="vp-vuln-name" title={explanation}>
      <abbr title={explanation}>{name}</abbr>
      <span className="vp-vuln-gloss"> — {explanation}</span>
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const entry = SEVERITY_LABELS[severity] ?? SEVERITY_LABELS.medium!;
  return (
    <span className={`vp-badge vp-badge-${entry.tone}`} title={entry.explanation}>
      {entry.label}
    </span>
  );
}

/** Bandeau affiché quand un point n'a pas pu être revérifié. */
function VerdictNotice({ finding }: { finding: ReportFinding }) {
  if (finding.claude_verdict === 'confirmed' && finding.evidence === 'code') return null;

  const message =
    finding.evidence === 'not_arbitrated'
      ? "Ce point n'a pas pu être revérifié une seconde fois. Il est affiché tel quel : fais-le confirmer par quelqu'un avant de conclure."
      : finding.claude_verdict === 'needs_human_review'
        ? "La seconde relecture n'a pas pu trancher : il manque des éléments dans ton code pour être certain. Une vérification humaine est nécessaire."
        : "Ce point a été revérifié sans accès complet au code : à prendre avec prudence.";

  return (
    <p className="vp-notice" role="note">
      ⚠️ {message}
    </p>
  );
}

export function FindingCard({ finding }: { finding: ReportFinding }) {
  // Replié par défaut : exigence explicite de la spec.
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <article className={`vp-finding vp-level-${finding.report_level}`}>
      <header className="vp-finding-head">
        <SeverityBadge severity={finding.severity} />
        <span className="vp-finding-route">
          {finding.http_method} {finding.route}
        </span>
      </header>

      {/* Ce que voit l'utilisateur non-technique, en premier et sans effort. */}
      <p className="vp-finding-plain">{finding.plain_language_summary}</p>

      <div className="vp-finding-fix">
        <strong>Ce qu'il faut faire : </strong>
        {finding.suggested_fix_direction}
      </div>

      <VerdictNotice finding={finding} />

      <button
        type="button"
        className="vp-toggle"
        onClick={() => setShowTechnical((open) => !open)}
        aria-expanded={showTechnical}
      >
        {showTechnical ? 'Masquer le détail technique' : 'Voir le détail technique'}
      </button>

      {showTechnical && (
        <div className="vp-finding-technical">
          <dl>
            <dt>Type de problème</dt>
            <dd>
              <VulnerabilityName name={finding.vulnerability} />
            </dd>

            <dt>Où</dt>
            <dd>
              {finding.file}
              {finding.line !== null ? ` (ligne ${finding.line})` : ''}
            </dd>

            <dt>Analyse</dt>
            <dd>{finding.technical_summary}</dd>

            <dt>Pourquoi ce verdict</dt>
            <dd>{finding.claude_reasoning}</dd>

            <dt>
              Catégorie de référence{' '}
              <abbr title={explainTerm('OWASP') ?? ''}>OWASP</abbr>
            </dt>
            <dd title={explainTerm(finding.owasp_category) ?? undefined}>{finding.owasp_category}</dd>
          </dl>
        </div>
      )}
    </article>
  );
}

export function ReportView({ report }: { report: SecurityReport }) {
  const { scan_summary: summary, findings } = report;

  return (
    <section className="vp-report">
      {/* Le verdict global, avant tout scroll. */}
      <header className="vp-report-header">
        <h2>Résultat de l'analyse</h2>
        <p className="vp-intro">{summary.plain_language_intro}</p>
        <ul className="vp-counters">
          <li className="vp-badge vp-badge-red">{summary.critical} à corriger vite</li>
          <li className="vp-badge vp-badge-orange">{summary.warning} à surveiller</li>
          {summary.dismissed_by_arbiter > 0 && (
            <li className="vp-badge vp-badge-grey">
              {summary.dismissed_by_arbiter} fausse(s) alerte(s) écartée(s)
            </li>
          )}
        </ul>
      </header>

      {findings.length === 0 ? (
        <p className="vp-empty">
          Rien à signaler sur ce scan : aucune faille retenue dans le code analysé.
        </p>
      ) : (
        findings.map((finding) => (
          <FindingCard key={`${finding.vulnerability}-${finding.http_method}-${finding.route}`} finding={finding} />
        ))
      )}
    </section>
  );
}
