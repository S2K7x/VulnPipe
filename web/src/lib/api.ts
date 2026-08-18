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
import type { ScanEstimate } from '../components/EstimatePanel.tsx';
import { getCurrentLocale } from '../i18n/context.tsx';
import { dictionary } from '../i18n/dictionary.ts';

/** Messages du client HTTP, dans la langue courante. */
const errors = () => dictionary(getCurrentLocale()).errors;

const BASE = import.meta.env?.VITE_API_URL ?? '';

export interface LaunchResponse {
  run_id: string;
  events_url: string;
  estimate: ScanEstimate | null;
  notes?: string[];
  plain_language_summary: string;
}

export interface EstimateResponse {
  estimate_id: string;
  expires_in_s: number;
  estimate: ScanEstimate;
  notes?: string[];
}

export interface ScanTarget {
  target: string;
  commit_sha?: string;
  mode: 'full_scan' | 'incremental_scan';
}

export interface RunSnapshot {
  run_id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  events: StepEvent[];
  error: string | null;
  report: SecurityReport | null;
  usage: UsageReport | null;
  estimate: ScanEstimate | null;
  target: { kind: 'directory' | 'file' | 'github'; label: string } | null;
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
      errors().unreachable
    );
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new ApiError(
      String(body.error ?? `HTTP ${response.status}`),
      String(body.plain_language_summary ?? errors().generic)
    );
  }
  return body as T;
}

export const api = {
  /**
   * Devis : ce que l'analyse va coûter, sans rien dépenser.
   *
   * Le serveur garde de côté le travail préparatoire (index, éventuel clone)
   * sous `estimate_id` : accepter le devis relance donc le scan sans tout
   * recommencer.
   */
  estimateScan(input: ScanTarget) {
    return request<EstimateResponse>('/estimate', {
      method: 'POST',
      body: JSON.stringify({ ...input, locale: getCurrentLocale() }),
    });
  },

  launchScan(input: ScanTarget & { estimate_id?: string }) {
    return request<LaunchResponse>('/webhook', {
      method: 'POST',
      body: JSON.stringify({ ...input, locale: getCurrentLocale() }),
    });
  },

  getRun(runId: string) {
    return request<RunSnapshot>(`/runs/${runId}`);
  },

  getProviders() {
    return request<{ settings: ProviderSettings; available: ProviderAvailability[]; notes?: string[] }>(
      `/providers?locale=${getCurrentLocale()}`
    );
  },

  setProviders(next: Partial<ProviderSettings>) {
    return request<{ settings: ProviderSettings; available: ProviderAvailability[]; notes?: string[] }>(
      '/providers',
      { method: 'POST', body: JSON.stringify({ ...next, locale: getCurrentLocale() }) }
    );
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
        handlers.onError(errors().streamLost);
      }
    };

    return () => source.close();
  },
};
