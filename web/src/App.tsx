/**
 * Application VulnPipe — « Vibe Coder Mode ».
 *
 * Parcours voulu pour quelqu'un qui ne code pas :
 *   1. il choisit CE QU'il veut vérifier — un dossier, un fichier, un dépôt
 *      GitHub — sans avoir à savoir ce qu'est un chemin absolu ;
 *   2. il comprend ce qui va se passer AVANT de lancer (PipelineExplainer) ;
 *   3. il voit ce que ça va coûter en temps et en argent, et décide (EstimatePanel) ;
 *   4. il suit le travail en direct, adresse par adresse (LiveActivity), avec
 *      la timeline des grandes étapes à côté ;
 *   5. il lit un résultat sans jargon, le détail technique restant replié ;
 *   6. il voit ce que ça a réellement coûté et peut changer de moteur d'IA.
 *
 * ============================================================================
 * LE BANDEAU D'OUVERTURE N'EST PAS UNE DÉCORATION
 *
 * Le rail d'étapes numérotées du bandeau affiche la pipeline réelle, et
 * surligne l'étape en cours pendant un scan. C'est le même objet qui sert de
 * promesse avant le lancement et de repère pendant l'attente : quelqu'un qui a
 * lu « 04 — Second opinion » en arrivant sait où il en est quand la vignette
 * s'allume vingt secondes plus tard.
 *
 * Un bandeau purement décoratif aurait occupé la même place sans rien
 * apprendre.
 * ============================================================================
 */

import { useEffect, useState } from 'react';

import { ScanLauncher } from './components/ScanLauncher.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { SettingsPage } from './components/SettingsPage.tsx';
import { EstimatePanel } from './components/EstimatePanel.tsx';
import { LiveActivity } from './components/LiveActivity.tsx';
import { ScanTimeline } from './components/ScanTimeline.tsx';
import { ReportView } from './components/ReportView.tsx';
import { UsagePanel } from './components/UsagePanel.tsx';
import type { ProviderAvailability, ProviderSettings } from './components/ProviderSwitcher.tsx';
import { PipelineExplainer } from './components/PipelineExplainer.tsx';
import { LanguageSwitcher } from './components/LanguageSwitcher.tsx';
import { useScan } from './lib/useScan.ts';
import { usePreferences } from './lib/preferences.ts';
import { Icon } from './components/Icon.tsx';
import { api, ApiError } from './lib/api.ts';
import { useI18n } from './i18n/context.tsx';
import { stepTranslations, STEP_ORDER, type StepName } from './lib/step_translations.ts';

type Tab = 'home' | 'scan' | 'settings';

/** Logo : un bloc typographique, pas une image à charger. */
function Logo() {
  return (
    <div className="vp-logo">
      <span className="vp-logo-mark">VP</span>
      <span className="vp-logo-word">
        Vuln
        <br />
        Pipe
      </span>
    </div>
  );
}

/**
 * Rail des étapes de la pipeline.
 *
 * Sert deux fois : promesse avant le scan, repère pendant. Les quatre étapes
 * montrées sont celles qui parlent à quelqu'un qui ne code pas ; les sept de
 * la timeline restent disponibles plus bas.
 */
function StepRail({ currentStep }: { currentStep: StepName | null }) {
  const { locale } = useI18n();
  const translations = stepTranslations(locale);
  const shown: StepName[] = ['indexing', 'detection', 'master_review', 'report'];
  const currentIndex = currentStep ? STEP_ORDER.indexOf(currentStep) : -1;

  return (
    <div className="vp-steprail">
      {shown.map((step, index) => {
        const isCurrent = currentStep === step;
        const isDone = currentIndex > STEP_ORDER.indexOf(step);
        return (
          <div
            key={step}
            className={`vp-steprail-item${isCurrent ? ' vp-current' : ''}${isDone ? ' vp-done' : ''}`}
          >
            <span className="vp-steprail-icon">
              <Icon name={translations[step].icon} size={18} />
            </span>
            <span className="vp-steprail-label">{translations[step].label}</span>
            <span className="vp-steprail-num">{String(index + 1).padStart(2, '0')}</span>
          </div>
        );
      })}
    </div>
  );
}

export function App() {
  const { state, estimate, confirm, cancelEstimate, reset } = useScan();
  const { locale, t } = useI18n();
  const { preferences, update } = usePreferences();
  // La présentation est la porte d'entrée : quelqu'un qui arrive doit pouvoir
  // comprendre ce que fait l'outil avant qu'on lui demande de désigner un
  // dossier. Le bouton d'appel à l'action l'emmène en un clic sur le lanceur.
  const [tab, setTab] = useState<Tab>('home');
  const [providers, setProviders] = useState<{
    settings: ProviderSettings;
    available: ProviderAvailability[];
  } | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  // Rechargé quand la langue change : les motifs d'indisponibilité
  // (« clé absente ») sont rédigés côté serveur, ils doivent suivre.
  useEffect(() => {
    api
      .getProviders()
      .then(setProviders)
      .catch((error) =>
        setProviderError(error instanceof ApiError ? error.friendly : (error as Error).message)
      );
  }, [locale]);

  /**
   * Acceptation automatique d'un devis négligeable.
   *
   * Seulement si l'utilisateur a lui-même posé un plafond dans les réglages
   * (0 par défaut, donc désactivé), et seulement quand le coût HAUT de la
   * fourchette passe sous ce plafond : accepter sur l'estimation basse
   * reviendrait à dépenser plus que le montant annoncé comme négligeable.
   *
   * Un devis non chiffrable n'est jamais accepté tout seul : « inconnu » ne
   * veut pas dire « petit ».
   */
  useEffect(() => {
    if (state.phase !== 'estimated' || !state.estimate) return;
    const ceiling = preferences.autoConfirmUnderUsd;
    if (ceiling <= 0) return;
    const { usd, free } = state.estimate.cost;
    const high = free ? 0 : usd?.high;
    if (high === undefined || high === null) return;
    if (high < ceiling) void confirm();
  }, [state.phase, state.estimate, preferences.autoConfirmUnderUsd, confirm]);

  const running = state.phase === 'running';
  const busy = running || state.phase === 'estimating';
  const report = state.snapshot?.report ?? null;
  const usage = state.snapshot?.usage ?? null;
  const showLive = running || state.phase === 'done' || state.phase === 'failed';

  return (
    <div className="vp-app">
      <header className="vp-header">
        <Logo />
        <nav className="vp-nav" aria-label={t.app.menu}>
          <button
            type="button"
            className={tab === 'home' ? 'vp-tab vp-tab-active' : 'vp-tab'}
            onClick={() => setTab('home')}
            aria-current={tab === 'home'}
          >
            {t.app.navHome}
          </button>
          <button
            type="button"
            className={tab === 'scan' ? 'vp-tab vp-tab-active' : 'vp-tab'}
            onClick={() => setTab('scan')}
            aria-current={tab === 'scan'}
          >
            {t.app.navAnalysis}
          </button>
          <button
            type="button"
            className={tab === 'settings' ? 'vp-tab vp-tab-active' : 'vp-tab'}
            onClick={() => setTab('settings')}
            aria-current={tab === 'settings'}
          >
            {t.app.navSettings}
          </button>
          <LanguageSwitcher />
        </nav>
      </header>

      {tab === 'home' ? (
        <main className="vp-main">
          <LandingPage onStart={() => setTab('scan')} />
        </main>
      ) : tab === 'settings' ? (
        <main className="vp-main">
          {providerError && (
            <p className="vp-banner vp-banner-error" role="alert">
              {providerError}
            </p>
          )}
          <SettingsPage
            providers={providers}
            busy={busy}
            onProviderChange={async (next) => {
              try {
                setProviders(await api.setProviders(next));
                setProviderError(null);
              } catch (error) {
                // L'erreur remonte au composant, qui l'affiche à côté du
                // réglage fautif plutôt qu'en haut de page.
                throw new Error(
                  error instanceof ApiError ? error.friendly : (error as Error).message
                );
              }
            }}
          />
        </main>
      ) : (
        <main className="vp-main">
          <section className="vp-hero">
            <span className="vp-kicker">Vulnerability pipeline</span>
            <h1>
              Ship code.
              <br />
              <em>Not holes.</em>
            </h1>
            <p className="vp-hero-lede">{t.app.tagline}</p>
            <StepRail currentStep={state.currentStep} />
          </section>

          {(state.phase === 'idle' || state.phase === 'estimating') && (
            <>
              <ScanLauncher
                onLaunch={(input) => {
                  if (preferences.rememberTarget) update({ lastTarget: input.target });
                  estimate(input);
                }}
                busy={busy}
                defaultPath={preferences.rememberTarget ? preferences.lastTarget : ''}
                defaultKind={preferences.defaultKind}
                defaultMode={preferences.defaultMode}
              />
              {state.phase === 'estimating' && (
                <p className="vp-banner vp-banner-info" role="status">
                  {t.estimate.estimating}
                </p>
              )}
              <PipelineExplainer />
            </>
          )}

          {/* Remarques du serveur : repli sur un autre moteur, mode dégradé...
              Elles concernent ce que l'utilisateur s'apprête à payer, donc
              elles s'affichent avant le devis, pas dans un journal. */}
          {state.notes.map((note, index) => (
            <p key={index} className="vp-banner vp-banner-warn" role="status">
              {note}
            </p>
          ))}

          {state.error && (
            <p className="vp-banner vp-banner-error" role="alert">
              {state.error}
            </p>
          )}

          {state.phase === 'estimated' && state.estimate && (
            <EstimatePanel
              estimate={state.estimate}
              onConfirm={() => void confirm()}
              onCancel={cancelEstimate}
            />
          )}

          {showLive && state.runId && (
            <>
              <LiveActivity
                events={state.events}
                currentStep={state.currentStep}
                running={running}
                expectedRoutes={state.estimate?.routes_selected ?? null}
              />
              <section className="vp-progress-section">
                <span className="vp-kicker">{t.timeline.heading}</span>
                <h2>{running ? t.timeline.heading : t.timeline.headingDone}</h2>
                <ScanTimeline
                  events={state.events}
                  showTechnicalDetail
                  showExplanations
                  openExplanations={preferences.explanationsByDefault}
                  currentStep={state.currentStep}
                />
              </section>
            </>
          )}

          {running && <PipelineExplainer currentStep={state.currentStep ?? undefined} />}

          {report && <ReportView report={report} target={state.snapshot?.target ?? null} />}
          {usage && <UsagePanel usage={usage} />}

          {(state.phase === 'done' || state.phase === 'failed') && (
            <button type="button" className="vp-secondary" onClick={reset}>
              {t.restart}
            </button>
          )}
        </main>
      )}

      <footer className="vp-footer">
        <Logo />
        <p>{t.app.footerNote}</p>
      </footer>
    </div>
  );
}
