/**
 * Application VulnPipe — « Vibe Coder Mode ».
 *
 * Parcours voulu pour quelqu'un qui ne code pas :
 *   1. il comprend ce qui va se passer AVANT de lancer (PipelineExplainer) ;
 *   2. il suit l'avancement en français, avec « à quoi ça sert ? » sous chaque
 *      étape ;
 *   3. il lit un résultat sans jargon, le détail technique restant replié ;
 *   4. il voit ce que ça a coûté et peut changer de moteur d'IA.
 */

import { useEffect, useState } from 'react';

import { ScanLauncher } from './components/ScanLauncher.tsx';
import { ScanTimeline } from './components/ScanTimeline.tsx';
import { ReportView } from './components/ReportView.tsx';
import { UsagePanel } from './components/UsagePanel.tsx';
import { ProviderSwitcher, type ProviderAvailability, type ProviderSettings } from './components/ProviderSwitcher.tsx';
import { PipelineExplainer } from './components/PipelineExplainer.tsx';
import { useScan } from './lib/useScan.ts';
import { api, ApiError } from './lib/api.ts';

type Tab = 'scan' | 'settings';

export function App() {
  const { state, launch, reset } = useScan();
  const [tab, setTab] = useState<Tab>('scan');
  const [providers, setProviders] = useState<{
    settings: ProviderSettings;
    available: ProviderAvailability[];
  } | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProviders()
      .then(setProviders)
      .catch((error) =>
        setProviderError(error instanceof ApiError ? error.friendly : (error as Error).message)
      );
  }, []);

  const busy = state.phase === 'running';
  const report = state.snapshot?.report ?? null;
  const usage = state.snapshot?.usage ?? null;

  return (
    <div className="vp-app">
      <header className="vp-header">
        <div>
          <h1>VulnPipe</h1>
          <p className="vp-tagline">
            On vérifie la sécurité de ton code et on t'explique ce qu'on trouve, sans jargon.
          </p>
        </div>
        <nav className="vp-tabs" aria-label="Sections">
          <button
            type="button"
            className={tab === 'scan' ? 'vp-tab vp-tab-active' : 'vp-tab'}
            onClick={() => setTab('scan')}
            aria-current={tab === 'scan'}
          >
            Analyse
          </button>
          <button
            type="button"
            className={tab === 'settings' ? 'vp-tab vp-tab-active' : 'vp-tab'}
            onClick={() => setTab('settings')}
            aria-current={tab === 'settings'}
          >
            Réglages
          </button>
        </nav>
      </header>

      {tab === 'settings' ? (
        <main className="vp-main">
          {providerError && (
            <p className="vp-banner vp-banner-error" role="alert">
              {providerError}
            </p>
          )}
          {providers && (
            <ProviderSwitcher
              settings={providers.settings}
              available={providers.available}
              disabled={busy}
              onChange={async (next) => {
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
          )}
        </main>
      ) : (
        <main className="vp-main">
          {state.phase === 'idle' && (
            <>
              <ScanLauncher onLaunch={launch} busy={busy} />
              <PipelineExplainer />
            </>
          )}

          {state.error && (
            <p className="vp-banner vp-banner-error" role="alert">
              {state.error}
            </p>
          )}

          {(state.phase === 'running' || state.phase === 'done' || state.phase === 'failed') &&
            state.runId && (
              <section className="vp-progress-section">
                <h2>{busy ? 'Analyse en cours' : "Ce qui s'est passé"}</h2>
                <ScanTimeline
                  events={state.events}
                  showTechnicalDetail
                  showExplanations
                  currentStep={state.currentStep}
                />
              </section>
            )}

          {busy && <PipelineExplainer currentStep={state.currentStep ?? undefined} />}

          {report && <ReportView report={report} />}
          {usage && <UsagePanel usage={usage} />}

          {(state.phase === 'done' || state.phase === 'failed') && (
            <button type="button" className="vp-secondary" onClick={reset}>
              Lancer une autre analyse
            </button>
          )}
        </main>
      )}

      <footer className="vp-footer">
        <p>
          Tu n'as pas besoin de comprendre le code pour utiliser VulnPipe. Chaque terme technique est
          traduit, et le détail reste replié tant que tu ne le demandes pas.
        </p>
      </footer>
    </div>
  );
}
