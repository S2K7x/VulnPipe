/**
 * Préférences d'usage, gardées dans le navigateur.
 *
 * ============================================================================
 * CE QUI A LE DROIT D'ÊTRE ICI
 *
 * Uniquement ce qui n'engage QUE cet écran : le pré-remplissage du lanceur,
 * les préférences de lecture, le seuil au-delà duquel on redemande une
 * confirmation. Tout ce qui change le comportement de l'analyse elle-même
 * (fournisseur d'IA, arbitrage) vit sur le serveur : deux onglets ouverts sur
 * la même machine ne doivent pas pouvoir lancer deux scans réglés
 * différemment.
 *
 * `localStorage` peut être indisponible (navigation privée stricte, iframe
 * cloisonnée). Chaque accès est donc protégé : une préférence qu'on ne peut
 * pas relire retombe sur le défaut, elle ne casse jamais l'écran.
 *
 * Un petit magasin avec abonnés plutôt qu'un contexte React : les préférences
 * sont lues par des composants qui ne partagent pas d'ancêtre proche
 * (le lanceur, le rapport, la page de réglages) et changent rarement.
 * ============================================================================
 */

import { useCallback, useSyncExternalStore } from 'react';

export type TargetKind = 'directory' | 'file' | 'github';
export type ScanMode = 'full_scan' | 'incremental_scan';

export interface Preferences {
  /** Onglet de cible présélectionné dans le lanceur. */
  defaultKind: TargetKind;
  /** Étendue proposée par défaut. */
  defaultMode: ScanMode;
  /** Repropose la dernière cible analysée. */
  rememberTarget: boolean;
  /** Dernière cible, si la mémorisation est active. */
  lastTarget: string;
  /**
   * Montant (en dollars) sous lequel le devis est accepté sans demander.
   *
   * 0 = toujours demander. C'est le défaut, et il est volontaire : rien ne
   * doit être dépensé sans un geste explicite tant que l'utilisateur n'a pas
   * lui-même fixé une limite qu'il juge négligeable.
   */
  autoConfirmUnderUsd: number;
  /** Ouvre d'emblée le détail technique des résultats. */
  technicalByDefault: boolean;
  /** Garde les explications « à quoi ça sert ? » dépliées. */
  explanationsByDefault: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  defaultKind: 'directory',
  defaultMode: 'full_scan',
  rememberTarget: true,
  lastTarget: '',
  autoConfirmUnderUsd: 0,
  technicalByDefault: false,
  explanationsByDefault: false,
};

const STORAGE_KEY = 'vulnpipe.preferences';

/** Relit et assainit ce qui est stocké : un champ inconnu ou d'un mauvais
 *  type est ignoré au profit du défaut, jamais propagé dans l'écran. */
function read(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return sanitize(parsed);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function sanitize(input: Partial<Preferences>): Preferences {
  const kinds: TargetKind[] = ['directory', 'file', 'github'];
  const modes: ScanMode[] = ['full_scan', 'incremental_scan'];
  const amount = Number(input.autoConfirmUnderUsd);
  return {
    defaultKind: kinds.includes(input.defaultKind as TargetKind)
      ? (input.defaultKind as TargetKind)
      : DEFAULT_PREFERENCES.defaultKind,
    defaultMode: modes.includes(input.defaultMode as ScanMode)
      ? (input.defaultMode as ScanMode)
      : DEFAULT_PREFERENCES.defaultMode,
    rememberTarget:
      typeof input.rememberTarget === 'boolean'
        ? input.rememberTarget
        : DEFAULT_PREFERENCES.rememberTarget,
    lastTarget: typeof input.lastTarget === 'string' ? input.lastTarget : '',
    // Un seuil négatif ou absurde vaut « toujours demander » : en cas de
    // doute sur une valeur qui autorise une dépense, on choisit de demander.
    autoConfirmUnderUsd: Number.isFinite(amount) && amount > 0 ? Math.min(amount, 100) : 0,
    technicalByDefault: input.technicalByDefault === true,
    explanationsByDefault: input.explanationsByDefault === true,
  };
}

let current: Preferences = read();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function getPreferences(): Preferences {
  return current;
}

export function setPreferences(patch: Partial<Preferences>): void {
  current = sanitize({ ...current, ...patch });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Stockage indisponible : le réglage vaut pour la session en cours.
  }
  emit();
}

export function resetPreferences(): void {
  current = DEFAULT_PREFERENCES;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // idem.
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Préférences courantes + modificateurs, réactifs. */
export function usePreferences(): {
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
  reset: () => void;
} {
  const preferences = useSyncExternalStore(subscribe, getPreferences, () => DEFAULT_PREFERENCES);
  const update = useCallback((patch: Partial<Preferences>) => setPreferences(patch), []);
  const reset = useCallback(() => resetPreferences(), []);
  return { preferences, update, reset };
}
