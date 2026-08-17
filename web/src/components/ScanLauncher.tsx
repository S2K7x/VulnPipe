/**
 * Formulaire de lancement d'un scan.
 *
 * Écrit pour quelqu'un qui ne code pas : pas de `repo_path`, pas de
 * `commit_sha`, pas de `full_scan`. Des questions en français, et le
 * vocabulaire technique traduit dans l'aide de chaque champ.
 */

import { useState } from 'react';

export interface ScanLauncherProps {
  onLaunch: (input: {
    repoPath: string;
    commitSha?: string;
    mode: 'full_scan' | 'incremental_scan';
  }) => void;
  busy?: boolean;
  /** Chemin proposé par défaut (exemple fourni avec le projet). */
  defaultPath?: string;
}

export function ScanLauncher({ onLaunch, busy, defaultPath = '' }: ScanLauncherProps) {
  const [repoPath, setRepoPath] = useState(defaultPath);
  const [mode, setMode] = useState<'full_scan' | 'incremental_scan'>('full_scan');
  const [commitSha, setCommitSha] = useState('');
  const [touched, setTouched] = useState(false);

  const invalid = touched && repoPath.trim().length === 0;

  return (
    <form
      className="vp-launcher"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        setTouched(true);
        if (repoPath.trim().length === 0) return;
        onLaunch({ repoPath: repoPath.trim(), commitSha: commitSha.trim() || undefined, mode });
      }}
    >
      <h2>Analyser un projet</h2>

      <label htmlFor="vp-repo">
        <strong>Où se trouve ton projet ?</strong>
        <span className="vp-field-help">
          Le dossier sur ton ordinateur qui contient le code à vérifier.
        </span>
      </label>
      <input
        id="vp-repo"
        value={repoPath}
        placeholder="/Users/moi/mon-projet"
        onChange={(changeEvent) => setRepoPath(changeEvent.target.value)}
        onBlur={() => setTouched(true)}
        disabled={busy}
        aria-invalid={invalid}
        aria-describedby={invalid ? 'vp-repo-error' : undefined}
      />
      {invalid && (
        <p id="vp-repo-error" className="vp-field-error" role="alert">
          Indique le dossier de ton projet pour lancer l'analyse.
        </p>
      )}

      <fieldset className="vp-mode">
        <legend>
          <strong>Quelle étendue ?</strong>
        </legend>

        <label className="vp-radio">
          <input
            type="radio"
            name="mode"
            checked={mode === 'full_scan'}
            onChange={() => setMode('full_scan')}
            disabled={busy}
          />
          <span>
            <strong>Tout le projet</strong>
            <span className="vp-field-help">
              Plus long et plus coûteux, mais rien n'est laissé de côté. À faire la première fois.
            </span>
          </span>
        </label>

        <label className="vp-radio">
          <input
            type="radio"
            name="mode"
            checked={mode === 'incremental_scan'}
            onChange={() => setMode('incremental_scan')}
            disabled={busy}
          />
          <span>
            <strong>Seulement ce qui a changé</strong>
            <span className="vp-field-help">
              Beaucoup plus rapide et moins cher : on ne revérifie que les parties modifiées depuis
              une version donnée. C'est le mode du quotidien.
            </span>
          </span>
        </label>
      </fieldset>

      {mode === 'incremental_scan' && (
        <>
          <label htmlFor="vp-commit">
            <strong>Depuis quelle version ?</strong>
            <span className="vp-field-help">
              L'identifiant de l'enregistrement à partir duquel comparer. Si tu ne le connais pas,
              laisse vide : tout le projet sera analysé, et on te le dira.
            </span>
          </label>
          <input
            id="vp-commit"
            value={commitSha}
            placeholder="laisser vide si tu ne sais pas"
            onChange={(changeEvent) => setCommitSha(changeEvent.target.value)}
            disabled={busy}
          />
        </>
      )}

      <button type="submit" className="vp-primary" disabled={busy}>
        {busy ? 'Analyse en cours...' : "Lancer l'analyse"}
      </button>
    </form>
  );
}
