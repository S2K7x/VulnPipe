/**
 * Sélecteur de fournisseur d'IA, à chaud.
 *
 * Fonctionnalité demandée, absente de PHASE_6. Jusqu'ici, changer de moteur
 * imposait de modifier `.env` et de relancer le serveur.
 *
 * Deux fournisseurs distincts sont exposés, conformément à `CLAUDE.md` §2 :
 * celui des détecteurs (appelé sur chaque route, donc le poste de coût) et
 * celui du master (appelé une fois, sur les cas ambigus).
 *
 * Un fournisseur sans clé est affiché DÉSACTIVÉ avec la raison, plutôt que
 * masqué : l'utilisateur doit comprendre qu'il existe et ce qui lui manque
 * pour s'en servir.
 */

import { useState } from 'react';

export type ProviderName = 'gemini' | 'ollama' | 'anthropic' | 'openai' | 'openrouter' | 'custom';

export interface ProviderSettings {
  nodeProvider: ProviderName;
  nodeModel?: string;
  masterProvider: ProviderName;
  masterModel?: string;
}

export interface ProviderAvailability {
  id: ProviderName;
  available: boolean;
  why: string | null;
}

export interface ProviderSwitcherProps {
  settings: ProviderSettings;
  available: ProviderAvailability[];
  onChange: (next: Partial<ProviderSettings>) => Promise<void> | void;
  disabled?: boolean;
}

const PROVIDER_LABELS: Record<ProviderName, { name: string; hint: string }> = {
  gemini: { name: 'Google Gemini', hint: 'Rapide et peu coûteux. Une clé suffit.' },
  ollama: { name: 'Ollama (sur ta machine)', hint: 'Gratuit et privé : rien ne sort de ton ordinateur.' },
  anthropic: { name: 'Claude (Anthropic)', hint: 'Le plus fiable pour trancher les cas ambigus.' },
  openai: { name: 'OpenAI', hint: 'Modèles GPT.' },
  openrouter: { name: 'OpenRouter', hint: 'Accès à de nombreux modèles, dont des gratuits.' },
  custom: { name: 'Serveur personnalisé', hint: 'Tout serveur compatible OpenAI que tu héberges.' },
};

/** Modèles conseillés par fournisseur, pour éviter la saisie à l'aveugle. */
const SUGGESTED_MODELS: Partial<Record<ProviderName, string[]>> = {
  gemini: ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  openrouter: ['openrouter/free', 'openai/gpt-oss-20b:free', 'z-ai/glm-5.2:free'],
  anthropic: ['claude-opus-5', 'claude-sonnet-5'],
  ollama: ['qwen3.5:9b'],
};

function ProviderSelect({
  id,
  label,
  description,
  value,
  model,
  available,
  disabled,
  onProvider,
  onModel,
}: {
  id: string;
  label: string;
  description: string;
  value: ProviderName;
  model?: string;
  available: ProviderAvailability[];
  disabled?: boolean;
  onProvider: (next: ProviderName) => void;
  onModel: (next: string) => void;
}) {
  const current = available.find((entry) => entry.id === value);
  const suggestions = SUGGESTED_MODELS[value] ?? [];

  return (
    <div className="vp-provider-block">
      <label htmlFor={id}>
        <strong>{label}</strong>
        <span className="vp-provider-desc">{description}</span>
      </label>

      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onProvider(event.target.value as ProviderName)}
      >
        {available.map((entry) => (
          <option key={entry.id} value={entry.id} disabled={!entry.available}>
            {PROVIDER_LABELS[entry.id]?.name ?? entry.id}
            {entry.available ? '' : ' — clé manquante'}
          </option>
        ))}
      </select>

      <p className="vp-provider-hint">{PROVIDER_LABELS[value]?.hint}</p>

      {current && !current.available && (
        <p className="vp-provider-warning" role="alert">
          Ce fournisseur ne peut pas être utilisé pour l'instant : {current.why}
        </p>
      )}

      <label htmlFor={`${id}-model`} className="vp-provider-model-label">
        Modèle (facultatif)
      </label>
      <input
        id={`${id}-model`}
        list={`${id}-suggestions`}
        value={model ?? ''}
        placeholder="modèle par défaut"
        disabled={disabled}
        onChange={(event) => onModel(event.target.value)}
      />
      <datalist id={`${id}-suggestions`}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </div>
  );
}

export function ProviderSwitcher({ settings, available, onChange, disabled }: ProviderSwitcherProps) {
  const [draft, setDraft] = useState<ProviderSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const apply = async () => {
    setSaving(true);
    setError(null);
    try {
      await onChange(draft);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="vp-providers" aria-label="Choix des intelligences artificielles">
      <h3>Quelle IA fait le travail</h3>

      <ProviderSelect
        id="vp-node-provider"
        label="Pour parcourir ton code"
        description="Sollicitée sur chaque adresse de ton application : c'est elle qui pèse sur le coût."
        value={draft.nodeProvider}
        model={draft.nodeModel}
        available={available}
        disabled={disabled || saving}
        onProvider={(nodeProvider) => setDraft((d) => ({ ...d, nodeProvider, nodeModel: undefined }))}
        onModel={(nodeModel) => setDraft((d) => ({ ...d, nodeModel: nodeModel || undefined }))}
      />

      <ProviderSelect
        id="vp-master-provider"
        label="Pour la seconde relecture"
        description="Sollicitée une seule fois, sur les points douteux. Privilégie la fiabilité."
        value={draft.masterProvider}
        model={draft.masterModel}
        available={available}
        disabled={disabled || saving}
        onProvider={(masterProvider) =>
          setDraft((d) => ({ ...d, masterProvider, masterModel: undefined }))
        }
        onModel={(masterModel) => setDraft((d) => ({ ...d, masterModel: masterModel || undefined }))}
      />

      {error && (
        <p className="vp-provider-warning" role="alert">
          {error}
        </p>
      )}

      <button type="button" onClick={apply} disabled={!dirty || saving || disabled}>
        {saving ? 'Application...' : 'Appliquer'}
      </button>
      {disabled && <p className="vp-provider-hint">Un scan est en cours : le réglage est figé jusqu'à la fin.</p>}
    </section>
  );
}
