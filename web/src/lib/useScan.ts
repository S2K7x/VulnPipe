/**
 * État d'un scan : lancement, suivi en direct, récupération du rapport.
 *
 * Isolé des composants pour être testable sans DOM.
 */

import { useCallback, useRef, useState } from 'react';

import { api, ApiError, type RunSnapshot } from './api.ts';
import type { StepEvent } from '../components/ScanTimeline.tsx';
import type { StepName } from './step_translations.ts';

export type ScanPhase = 'idle' | 'running' | 'done' | 'failed';

export interface ScanState {
  phase: ScanPhase;
  runId: string | null;
  events: StepEvent[];
  snapshot: RunSnapshot | null;
  /** Message déjà rédigé pour un non-développeur. */
  error: string | null;
  /** Étape en cours, pour surligner l'explication correspondante. */
  currentStep: StepName | null;
}

const INITIAL: ScanState = {
  phase: 'idle',
  runId: null,
  events: [],
  snapshot: null,
  error: null,
  currentStep: null,
};

export interface LaunchInput {
  repoPath: string;
  commitSha?: string;
  mode: 'full_scan' | 'incremental_scan';
}

export function useScan() {
  const [state, setState] = useState<ScanState>(INITIAL);
  const closeStream = useRef<(() => void) | null>(null);

  const reset = useCallback(() => {
    closeStream.current?.();
    closeStream.current = null;
    setState(INITIAL);
  }, []);

  const launch = useCallback(async (input: LaunchInput) => {
    closeStream.current?.();
    setState({ ...INITIAL, phase: 'running' });

    let launched;
    try {
      launched = await api.launchScan({
        repo_path: input.repoPath,
        commit_sha: input.commitSha || undefined,
        mode: input.mode,
      });
    } catch (error) {
      setState({
        ...INITIAL,
        phase: 'failed',
        error: error instanceof ApiError ? error.friendly : (error as Error).message,
      });
      return;
    }

    setState((previous) => ({ ...previous, runId: launched.run_id }));

    const finish = async () => {
      try {
        const snapshot = await api.getRun(launched.run_id);
        setState((previous) => ({
          ...previous,
          snapshot,
          // Un scan techniquement « terminé » mais sans rapport reste un échec
          // du point de vue de l'utilisateur : on ne l'affiche pas comme réussi.
          phase: snapshot.status === 'failed' || !snapshot.report ? 'failed' : 'done',
          error:
            snapshot.status === 'failed'
              ? "L'analyse s'est interrompue avant d'avoir produit un rapport."
              : previous.error,
        }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          phase: 'failed',
          error: error instanceof ApiError ? error.friendly : (error as Error).message,
        }));
      }
    };

    closeStream.current = api.streamEvents(launched.run_id, {
      onEvent: (event) =>
        setState((previous) => ({
          ...previous,
          events: [...previous.events, event],
          currentStep: event.status === 'running' ? (event.step as StepName) : previous.currentStep,
        })),
      onEnd: () => void finish(),
      onError: (message) => {
        // Le flux peut tomber alors que le scan continue côté serveur : on
        // récupère quand même l'état final plutôt que de rester bloqué.
        setState((previous) => ({ ...previous, error: message }));
        void finish();
      },
    });
  }, []);

  return { state, launch, reset };
}
