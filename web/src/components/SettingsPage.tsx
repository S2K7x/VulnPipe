/**
 * Page de réglages.
 *
 * ============================================================================
 * DEUX NATURES DE RÉGLAGE, ANNONCÉES COMME TELLES
 *
 * L'écran mélangeait jusqu'ici un seul bloc — le choix des moteurs d'IA. En
 * ajoutant des préférences, on introduit une confusion possible : certains
 * réglages changent CE QUE FAIT la pipeline (donc ce qu'elle facture, pour
 * tout le monde), d'autres ne changent que CE QUE MOI je vois.
 *
 * Chaque section porte donc une étiquette explicite : « appliqué sur le
 * serveur » ou « gardé dans ce navigateur ». Sans ça, quelqu'un qui coupe
 * l'arbitrage croit régler son confort de lecture, et se retrouve avec un
 * rapport plus brut sans comprendre pourquoi.
 *
 * L'ordre suit le coût de l'erreur : moteurs et arbitrage d'abord (ils
 * engagent de l'argent), défauts du lanceur ensuite, confort de lecture après,
 * état du système à la fin.
 * ============================================================================
 */

import { useCallback, useEffect, useState } from 'react';

import { api, ApiError, type ScanSettings } from '../lib/api.ts';
import { usePreferences } from '../lib/preferences.ts';
import { useI18n } from '../i18n/context.tsx';
import { LOCALES, dictionary, type Locale } from '../i18n/dictionary.ts';
import { Icon } from './Icon.tsx';
import {
  ProviderSwitcher,
  type ProviderAvailability,
  type ProviderSettings,
} from './ProviderSwitcher.tsx';

export interface SettingsPageProps {
  providers: { settings: ProviderSettings; available: ProviderAvailability[] } | null;
  onProviderChange: (next: Partial<ProviderSettings>) => Promise<void>;
  /** Un scan tourne : les réglages qui l'affecteraient en cours de route sont gelés. */
  busy?: boolean;
}

/** Interrupteur libellé, avec son explication sous le titre. */
function Toggle({
  id,
  label,
  help,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="vp-setting">
      <label className="vp-switch" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="vp-switch-track" aria-hidden="true">
          <span className="vp-switch-knob" />
        </span>
        <span className="vp-setting-text">
          <strong>{label}</strong>
          <span className="vp-field-help">{help}</span>
        </span>
      </label>
    </div>
  );
}

/** Étiquette de portée : serveur (engage tout le monde) ou navigateur (moi). */
function Scope({ kind }: { kind: 'server' | 'local' }) {
  const { t } = useI18n();
  return (
    <span className={`vp-scope vp-scope-${kind}`}>
      <Icon name={kind === 'server' ? 'server' : 'eye'} size={13} />
      {kind === 'server' ? t.settings.savedOnServer : t.settings.savedLocally}
    </span>
  );
}

export function SettingsPage({ providers, onProviderChange, busy }: SettingsPageProps) {
  const { locale, setLocale, t } = useI18n();
  const s = t.settings;
  const { preferences, update, reset } = usePreferences();

  const [scan, setScan] = useState<ScanSettings | null>(null);
  const [thresholds, setThresholds] = useState<{ reject_below: number; direct_alert_above: number }>({
    reject_below: 0.4,
    direct_alert_above: 0.7,
  });
  const [scanError, setScanError] = useState<string | null>(null);
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [resetDone, setResetDone] = useState(false);

  /**
   * Un seul appel sert deux choses : lire les réglages ET savoir si le serveur
   * répond. Pinguer séparément ajouterait une requête pour une information
   * qu'on obtient déjà.
   */
  const load = useCallback(() => {
    setHealth('checking');
    api
      .getScanSettings()
      .then((response) => {
        setScan(response.settings);
        setThresholds(response.thresholds);
        setScanError(null);
        setHealth('online');
      })
      .catch((error) => {
        setHealth('offline');
        setScanError(error instanceof ApiError ? error.friendly : (error as Error).message);
      });
  }, []);

  useEffect(load, [load]);

  const applyScan = async (next: Partial<ScanSettings>) => {
    // Optimiste : l'interrupteur bascule tout de suite, et revient en arrière
    // si le serveur refuse. Un interrupteur qui met une seconde à bouger donne
    // l'impression de ne pas avoir été cliqué.
    const previous = scan;
    setScan((current) => (current ? { ...current, ...next } : current));
    try {
      const response = await api.setScanSettings(next);
      setScan(response.settings);
      setThresholds(response.thresholds);
      setScanError(null);
    } catch (error) {
      setScan(previous);
      setScanError(error instanceof ApiError ? error.friendly : (error as Error).message);
    }
  };

  const amount = preferences.autoConfirmUnderUsd;

  return (
    <div className="vp-settings">
      <header className="vp-settings-head">
        <span className="vp-kicker">{t.app.navSettings}</span>
        <h2>{s.heading}</h2>
        <p className="vp-section-lede">{s.lede}</p>
      </header>

      {/* --- Moteurs d'IA ---------------------------------------------------- */}
      <section className="vp-settings-block">
        <Scope kind="server" />
        {providers && (
          <ProviderSwitcher
            settings={providers.settings}
            available={providers.available}
            disabled={busy}
            onChange={onProviderChange}
          />
        )}
      </section>

      {/* --- Arbitrage -------------------------------------------------------- */}
      <section className="vp-settings-block">
        <Scope kind="server" />
        <span className="vp-kicker">{s.arbitrationKicker}</span>
        <h3>{s.arbitrationTitle}</h3>
        <p className="vp-field-help">{s.arbitrationLede}</p>

        <Toggle
          id="vp-bypass"
          label={s.bypassLabel}
          help={s.bypassHelp}
          checked={scan?.bypassClaudeForHighConfidence ?? false}
          disabled={busy || scan === null}
          onChange={(next) => void applyScan({ bypassClaudeForHighConfidence: next })}
        />
        {scan?.bypassClaudeForHighConfidence && (
          <p className="vp-provider-warning" role="status">
            <Icon name="warning" size={15} />
            {s.bypassWarning}
          </p>
        )}
        {scanError && (
          <p className="vp-provider-warning" role="alert">
            {scanError}
          </p>
        )}

        {/* Les seuils viennent du serveur : les recopier en dur ici les ferait
            mentir le jour où ils bougeraient. */}
        <h4 className="vp-settings-subhead">{s.thresholdsTitle}</h4>
        <p className="vp-field-help">{s.thresholdsLede}</p>
        <ul className="vp-threshold-list">
          <li className="vp-tone-green">
            <code>0.0 – {thresholds.reject_below.toFixed(1)}</code>
            <span>{t.landing.zones[0]!.title}</span>
          </li>
          <li className="vp-tone-orange">
            <code>
              {thresholds.reject_below.toFixed(1)} – {thresholds.direct_alert_above.toFixed(1)}
            </code>
            <span>{t.landing.zones[1]!.title}</span>
          </li>
          <li className="vp-tone-red">
            <code>{thresholds.direct_alert_above.toFixed(1)} – 1.0</code>
            <span>{t.landing.zones[2]!.title}</span>
          </li>
        </ul>
      </section>

      {/* --- Défauts du lanceur ------------------------------------------------ */}
      <section className="vp-settings-block">
        <Scope kind="local" />
        <span className="vp-kicker">{s.scanKicker}</span>
        <h3>{s.scanTitle}</h3>
        <p className="vp-field-help">{s.scanLede}</p>

        <div className="vp-setting">
          <label htmlFor="vp-default-kind">
            <strong>{s.defaultKindLabel}</strong>
            <span className="vp-field-help">{s.defaultKindHelp}</span>
          </label>
          <select
            id="vp-default-kind"
            value={preferences.defaultKind}
            onChange={(event) => update({ defaultKind: event.target.value as never })}
          >
            <option value="directory">{t.launcher.tabs.directory}</option>
            <option value="file">{t.launcher.tabs.file}</option>
            <option value="github">{t.launcher.tabs.github}</option>
          </select>
        </div>

        <div className="vp-setting">
          <label htmlFor="vp-default-mode">
            <strong>{s.defaultModeLabel}</strong>
            <span className="vp-field-help">{s.defaultModeHelp}</span>
          </label>
          <select
            id="vp-default-mode"
            value={preferences.defaultMode}
            onChange={(event) => update({ defaultMode: event.target.value as never })}
          >
            <option value="full_scan">{t.launcher.fullTitle}</option>
            <option value="incremental_scan">{t.launcher.incrementalTitle}</option>
          </select>
        </div>

        <Toggle
          id="vp-remember-target"
          label={s.rememberTargetLabel}
          help={s.rememberTargetHelp}
          checked={preferences.rememberTarget}
          onChange={(next) => update({ rememberTarget: next })}
        />
        {preferences.rememberTarget && (
          <p className="vp-remembered">
            <Icon name={preferences.lastTarget ? 'folder' : 'dot'} size={15} />
            <code>{preferences.lastTarget || s.rememberedTargetNone}</code>
            {preferences.lastTarget && (
              <button type="button" className="vp-link" onClick={() => update({ lastTarget: '' })}>
                {s.forgetTarget}
              </button>
            )}
          </p>
        )}

        <div className="vp-setting">
          <label htmlFor="vp-auto-confirm">
            <strong>{s.autoConfirmLabel}</strong>
            <span className="vp-field-help">{s.autoConfirmHelp}</span>
          </label>
          <div className="vp-inline-field">
            <input
              id="vp-auto-confirm"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={amount}
              onChange={(event) => update({ autoConfirmUnderUsd: Number(event.target.value) })}
            />
            <span className="vp-unit">$</span>
          </div>
          <p className={amount > 0 ? 'vp-field-help vp-field-note' : 'vp-field-help'}>
            {amount > 0 ? s.autoConfirmOn(`${amount.toFixed(2)} $`) : s.autoConfirmOff}
          </p>
        </div>
      </section>

      {/* --- Confort de lecture ------------------------------------------------ */}
      <section className="vp-settings-block">
        <Scope kind="local" />
        <span className="vp-kicker">{s.displayKicker}</span>
        <h3>{s.displayTitle}</h3>
        <p className="vp-field-help">{s.displayLede}</p>

        <Toggle
          id="vp-technical-default"
          label={s.technicalByDefaultLabel}
          help={s.technicalByDefaultHelp}
          checked={preferences.technicalByDefault}
          onChange={(next) => update({ technicalByDefault: next })}
        />
        <Toggle
          id="vp-explanations-default"
          label={s.explanationsLabel}
          help={s.explanationsHelp}
          checked={preferences.explanationsByDefault}
          onChange={(next) => update({ explanationsByDefault: next })}
        />

        <div className="vp-setting">
          <span className="vp-setting-text">
            <strong>{s.languageLabel}</strong>
            <span className="vp-field-help">{s.languageHelp}</span>
          </span>
          <div className="vp-lang vp-lang-wide" role="group" aria-label={t.app.languageLabel}>
            {LOCALES.map((id: Locale) => (
              <button
                key={id}
                type="button"
                onClick={() => setLocale(id)}
                aria-pressed={locale === id}
              >
                {dictionary(id).localeName}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* --- État du système ---------------------------------------------------- */}
      <section className="vp-settings-block">
        <span className="vp-kicker">{s.systemKicker}</span>
        <h3>{s.systemTitle}</h3>
        <p className="vp-field-help">{s.systemLede}</p>

        <p className={`vp-health vp-health-${health}`}>
          <Icon
            name={health === 'online' ? 'check' : health === 'offline' ? 'warning' : 'clock'}
            size={16}
          />
          <strong>{s.serverLabel}</strong>
          <span>
            {health === 'online' ? s.serverOnline : health === 'offline' ? s.serverOffline : s.serverChecking}
          </span>
          <button type="button" className="vp-link" onClick={load}>
            {s.recheck}
          </button>
        </p>

        <h4 className="vp-settings-subhead">{s.keysTitle}</h4>
        <p className="vp-field-help">{s.keysLede}</p>
        <ul className="vp-key-list">
          {(providers?.available ?? []).map((entry) => (
            <li key={entry.id} className={entry.available ? 'vp-key-ready' : undefined}>
              <Icon name={entry.available ? 'key' : 'lock'} size={15} />
              <strong>{t.providers.names[entry.id] ?? entry.id}</strong>
              <span>{entry.available ? s.keyReady : (entry.why ?? s.keyMissing)}</span>
            </li>
          ))}
        </ul>

        <h4 className="vp-settings-subhead">{s.resetTitle}</h4>
        <p className="vp-field-help">{s.resetHelp}</p>
        <button
          type="button"
          className="vp-secondary"
          onClick={() => {
            reset();
            setResetDone(true);
          }}
        >
          <Icon name="reset" size={15} />
          {s.reset}
        </button>
        {resetDone && (
          <p className="vp-field-help vp-field-note" role="status">
            {s.resetDone}
          </p>
        )}
      </section>
    </div>
  );
}
