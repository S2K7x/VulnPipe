/**
 * Sélection du fournisseur de LLM par configuration.
 *
 * Un node de détection ne doit JAMAIS importer un fournisseur concret : il
 * reçoit un `LlmClient`. Changer de moteur = changer une variable
 * d'environnement, pas une ligne de code de détection.
 *
 *   VULNPIPE_LLM_PROVIDER = gemini | ollama | anthropic | openai | openrouter | custom
 *   VULNPIPE_LLM_MODEL    = surcharge du modèle (optionnel)
 *
 * Clés lues : GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY,
 *             OPENROUTER_API_KEY, VULNPIPE_LLM_BASE_URL (pour `custom`).
 */

import { DEFAULT_LOCALE, type Locale } from '../../../i18n/locale.ts';
import { messages } from '../../../i18n/messages.ts';
import { AnthropicClient, DEFAULT_ANTHROPIC_MODEL } from './anthropic.ts';
import { DEFAULT_GEMINI_MODEL, GeminiClient } from './gemini.ts';
import { OllamaClient } from './ollama.ts';
import { OpenAiCompatibleClient } from './openai-compatible.ts';
import { LlmError, type LlmClient } from './types.ts';

export type ProviderName = 'gemini' | 'ollama' | 'anthropic' | 'openai' | 'openrouter' | 'custom';

export const SUPPORTED_PROVIDERS: ProviderName[] = [
  'gemini',
  'ollama',
  'anthropic',
  'openai',
  'openrouter',
  'custom',
];

export interface FactoryEnv {
  VULNPIPE_LLM_PROVIDER?: string;
  VULNPIPE_LLM_MODEL?: string;
  VULNPIPE_LLM_BASE_URL?: string;
  GEMINI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  /** Nom alternatif rencontré dans la nature — les deux sont acceptés. */
  OPEN_ROUTER_API_KEY?: string;
  OLLAMA_HOST?: string;
}

/**
 * Fournisseur par défaut : Gemini.
 *
 * `CLAUDE.md` §1 vise le local gratuit comme cible, mais un défaut qui exige
 * un `ollama serve` en marche et un modèle de 6 Go téléchargé échoue au
 * premier lancement chez la plupart des utilisateurs. Gemini part d'une seule
 * clé et reste peu coûteux ; `VULNPIPE_LLM_PROVIDER=ollama` bascule en local.
 */
export const DEFAULT_PROVIDER: ProviderName = 'gemini';

export function createLlmClient(env: FactoryEnv = process.env as FactoryEnv): LlmClient {
  const requested = (env.VULNPIPE_LLM_PROVIDER ?? DEFAULT_PROVIDER).toLowerCase();

  if (!SUPPORTED_PROVIDERS.includes(requested as ProviderName)) {
    throw new LlmError(
      requested,
      'unknown',
      `Unknown provider "${requested}". Accepted values: ${SUPPORTED_PROVIDERS.join(', ')}.`,
      false
    );
  }

  const model = env.VULNPIPE_LLM_MODEL;

  switch (requested as ProviderName) {
    case 'gemini':
      return new GeminiClient({
        apiKey: requireKey(env.GEMINI_API_KEY, 'GEMINI_API_KEY', 'gemini'),
        model: model ?? DEFAULT_GEMINI_MODEL,
      });

    case 'ollama':
      return new OllamaClient({
        model: model ?? 'qwen3.5:9b',
        baseUrl: env.OLLAMA_HOST,
      });

    case 'anthropic':
      return new AnthropicClient({
        apiKey: env.ANTHROPIC_API_KEY,
        model: model ?? DEFAULT_ANTHROPIC_MODEL,
      });

    case 'openai':
      return new OpenAiCompatibleClient({
        providerName: 'openai',
        apiKey: requireKey(env.OPENAI_API_KEY, 'OPENAI_API_KEY', 'openai'),
        model: model ?? 'gpt-5',
        baseUrl: 'https://api.openai.com/v1',
      });

    case 'openrouter':
      return new OpenAiCompatibleClient({
        providerName: 'openrouter',
        apiKey: requireKey(
          env.OPENROUTER_API_KEY ?? env.OPEN_ROUTER_API_KEY,
          'OPENROUTER_API_KEY (ou OPEN_ROUTER_API_KEY)',
          'openrouter'
        ),
        // `openrouter/free` route vers les modèles gratuits uniquement :
        // tarif 0 garanti, vérifié sur l'API (pricing prompt/completion = 0).
        model: model ?? 'openrouter/free',
        baseUrl: 'https://openrouter.ai/api/v1',
        extraHeaders: { 'X-Title': 'VulnPipe' },
      });

    case 'custom': {
      const baseUrl = env.VULNPIPE_LLM_BASE_URL;
      if (!baseUrl) {
        throw new LlmError(
          'custom',
          'unknown',
          'VULNPIPE_LLM_BASE_URL is required when VULNPIPE_LLM_PROVIDER=custom.',
          false
        );
      }
      return new OpenAiCompatibleClient({
        providerName: 'custom',
        // Beaucoup de serveurs locaux OpenAI-compatibles ignorent la clé.
        apiKey: env.OPENAI_API_KEY ?? 'non-utilisee',
        model: model ?? 'local-model',
        baseUrl,
      });
    }
  }
}

function requireKey(value: string | undefined, envName: string, provider: string): string {
  if (!value) {
    throw new LlmError(
      provider,
      'auth',
      `${envName} is missing. Add it to .env (that file is git-ignored).`,
      false
    );
  }
  return value;
}

/**
 * Disponibilité réelle de chaque fournisseur.
 *
 * NE PAS déduire la disponibilité d'un `createLlmClient()` qui n'a pas levé :
 * le SDK Anthropic construit un client sans clé et n'échoue qu'au moment de
 * l'appel. L'interface annonçait donc « prêt » un fournisseur qui allait
 * planter en plein scan — bug attrapé par un test.
 */
export interface ProviderAvailability {
  id: ProviderName;
  available: boolean;
  /** Ce qui manque, formulé pour être actionnable. */
  why: string | null;
}

export function describeProviders(
  env: FactoryEnv = process.env as FactoryEnv,
  locale: Locale = DEFAULT_LOCALE
): ProviderAvailability[] {
  const t = messages(locale).providers;
  const ready = (id: ProviderName): ProviderAvailability => ({ id, available: true, why: null });
  const missing = (id: ProviderName, why: string): ProviderAvailability => ({
    id,
    available: false,
    why,
  });

  return SUPPORTED_PROVIDERS.map((id) => {
    switch (id) {
      case 'gemini':
        return env.GEMINI_API_KEY ? ready(id) : missing(id, t.missingKey('GEMINI_API_KEY'));
      case 'anthropic':
        return env.ANTHROPIC_API_KEY ? ready(id) : missing(id, t.missingAnthropic);
      case 'openai':
        return env.OPENAI_API_KEY ? ready(id) : missing(id, t.missingKey('OPENAI_API_KEY'));
      case 'openrouter':
        return env.OPENROUTER_API_KEY ?? env.OPEN_ROUTER_API_KEY
          ? ready(id)
          : missing(id, t.missingKey('OPENROUTER_API_KEY (or OPEN_ROUTER_API_KEY)'));
      case 'ollama':
        // Pas de clé, mais un serveur local doit tourner : on ne peut pas le
        // savoir sans requête réseau, donc on l'annonce comme utilisable et
        // c'est l'erreur d'appel qui informera précisément.
        return ready(id);
      case 'custom':
        return env.VULNPIPE_LLM_BASE_URL ? ready(id) : missing(id, t.missingBaseUrl);
    }
  });
}
