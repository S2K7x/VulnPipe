/**
 * Client HTTP de l'API VulnPipe.
 *
 * Toute erreur est traduite : l'utilisateur cible ne doit jamais voir un code
 * de statut nu ou un message technique.
 */

import type { StepEvent } from '../components/ScanTimeline.tsx';
import type { SecurityReport } from '../components/ReportView.tsx';
import type { UsageReport } from '../components/UsagePanel.tsx';
import type { ProviderAvailability, ProviderSettings } from '../components/ProviderSwitcher.tsx';

const BASE = import.meta.env?.VITE_API_URL ?? '';

export interface LaunchResponse {
  run_id: string;
  events_url: string;
  plain_language_summary: string;
}

export interface RunSnapshot {
  run_id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  events: StepEvent[];
  error: string | null;
  report: SecurityReport | null;
  usage: UsageReport | null;
  effective_mode: 'full_scan' | 'incremental_scan' | null;
  routes_analyzed: number | null;
  routes_failed: number | null;
}

/** Erreur portant un message déjà lisible par un non-développeur. */
export class ApiError extends Error {
  readonly friendly: string;
  constructor(technical: string, friendly: string) {
    super(technical);
    this.name = 'ApiError';
    this.friendly = friendly;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (error) {
    throw new ApiError(
      (error as Error).message,
      "Impossible de joindre le service d'analyse. Vérifie qu'il est bien démarré."
    );
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new ApiError(
      String(body.error ?? `HTTP ${response.status}`),
      String(body.plain_language_summary ?? "L'opération n'a pas pu aboutir.")
    );
  }
  return body as T;
}

export const api = {
  launchScan(input: { repo_path: string; commit_sha?: string; mode: 'full_scan' | 'incremental_scan' }) {
    return request<LaunchResponse>('/webhook', { method: 'POST', body: JSON.stringify(input) });
  },

  getRun(runId: string) {
    return request<RunSnapshot>(`/runs/${runId}`);
  },

  getProviders() {
    return request<{ settings: ProviderSettings; available: ProviderAvailability[] }>('/providers');
  },

  setProviders(next: Partial<ProviderSettings>) {
    return request<{ settings: ProviderSettings; available: ProviderAvailability[] }>('/providers', {
      method: 'POST',
      body: JSON.stringify(next),
    });
  },

  /**
   * Ouvre le flux d'événements.
   *
   * `EventSource` plutôt qu'un `fetch` en boucle : la reconnexion automatique
   * est gérée par le navigateur, et le serveur rejoue l'historique à chaque
   * connexion — un utilisateur qui rafraîchit sa page ne perd pas la timeline.
   */
  streamEvents(
    runId: string,
    handlers: { onEvent: (event: StepEvent) => void; onEnd: () => void; onError: (message: string) => void }
  ): () => void {
    const source = new EventSource(`${BASE}/runs/${runId}/events`);

    source.onmessage = (message) => {
      try {
        handlers.onEvent(JSON.parse(message.data) as StepEvent);
      } catch {
        // Une trame illisible ne doit pas casser le suivi en cours.
      }
    };
    source.addEventListener('end', () => {
      source.close();
      handlers.onEnd();
    });
    source.onerror = () => {
      // `EventSource` déclenche aussi `onerror` à la fermeture normale du
      // flux : on ne signale une panne que si la connexion est réellement
      // perdue alors qu'on attendait encore des événements.
      if (source.readyState === EventSource.CLOSED) {
        handlers.onError("Le suivi en direct s'est interrompu. Le résultat reste consultable.");
      }
    };

    return () => source.close();
  },
};
