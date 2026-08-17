/**
 * Contrat commun à tous les fournisseurs de LLM.
 *
 * `CLAUDE.md` §1 pose le low-cost comme promesse non négociable, mais ne dit
 * pas QUEL moteur : un utilisateur peut vouloir du 100 % local (Ollama), un
 * autre payer une API rapide. Les nodes de détection ne doivent donc jamais
 * connaître le fournisseur — ils reçoivent un `LlmClient` et rien d'autre.
 *
 * PHASE_3 impose `src/nodes/shared/` pour tout ce qui est générique : c'est ici.
 */

/**
 * Sous-ensemble de JSON Schema commun à tous les fournisseurs.
 *
 * Volontairement minimal : chaque fournisseur a son dialecte (Gemini utilise
 * un sous-ensemble OpenAPI, Ollama passe le schéma à une grammaire GBNF,
 * OpenAI exige `additionalProperties: false`). On ne garde que ce qui est
 * supporté partout, et chaque adaptateur traduit.
 */
export interface JsonSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
}

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface LlmRequest {
  system: string;
  user: string;
  /** Schéma de sortie. Sans lui, les modèles répondent en prose — vérifié. */
  schema: JsonSchema;
  /** 0 = déterministe. Ignoré par les fournisseurs qui le refusent (voir anthropic.ts). */
  temperature?: number;
  maxOutputTokens?: number;
}

export interface LlmUsage {
  input_tokens: number;
  output_tokens: number;
  /**
   * Tokens de raisonnement interne, quand le fournisseur les expose.
   *
   * À surveiller de près : sur gemini-3.5-flash, un verdict de 104 tokens de
   * sortie en a consommé 634 de raisonnement — 6× le coût visible. C'est le
   * poste de dépense qui décide si la promesse low-cost tient.
   */
  thinking_tokens?: number;
  /**
   * Coût réel en dollars, quand le fournisseur le renvoie.
   * OpenRouter l'expose dans `usage.cost` — c'est la seule source fiable :
   * un calcul maison à partir d'une grille tarifaire est faux dès qu'un prix
   * change ou qu'un routeur bascule vers un autre modèle en cours de route.
   */
  cost_usd?: number;
  /**
   * Fournisseur réellement sollicité derrière un routeur.
   * `openrouter/free` peut servir la requête depuis n'importe quel modèle
   * gratuit : sans ce champ, un rapport ne sait pas qui l'a produit.
   */
  upstream_provider?: string;
  /** Modèle réellement utilisé, s'il diffère de celui demandé (routeurs). */
  resolved_model?: string;
}

export interface LlmResponse<T = unknown> {
  /** JSON déjà parsé et conforme au schéma demandé. */
  parsed: T;
  /** Texte brut renvoyé — conservé pour diagnostic quand le parse échoue. */
  raw: string;
  provider: string;
  model: string;
  usage: LlmUsage;
  latency_ms: number;
}

export interface LlmClient {
  readonly provider: string;
  readonly model: string;
  complete<T = unknown>(request: LlmRequest): Promise<LlmResponse<T>>;
}

/** Erreur normalisée : les nodes ne doivent pas connaître les codes de chaque API. */
export class LlmError extends Error {
  readonly provider: string;
  readonly kind: LlmErrorKind;
  /** true si un nouvel essai a une chance d'aboutir. */
  readonly retryable: boolean;

  constructor(provider: string, kind: LlmErrorKind, message: string, retryable: boolean) {
    super(message);
    this.name = 'LlmError';
    this.provider = provider;
    this.kind = kind;
    this.retryable = retryable;
  }
}

export type LlmErrorKind =
  | 'auth' // clé absente ou invalide
  | 'rate_limit' // quota dépassé
  | 'unavailable' // serveur injoignable ou tombé (fréquent en local)
  | 'bad_output' // réponse non conforme au schéma
  | 'unknown';

/**
 * Réessaie un appel sur erreur transitoire (quota, serveur indisponible).
 *
 * Motivé par une observation : sur le palier gratuit Gemini (20 requêtes/min),
 * un scan de 7 routes fait échouer les dernières en `RESOURCE_EXHAUSTED`. Sans
 * reprise, la pipeline rend un rapport incomplet alors qu'il suffisait
 * d'attendre onze secondes — l'API donne d'ailleurs le délai à respecter.
 *
 * Les erreurs non transitoires (`auth`, `bad_output`) ne sont jamais réessayées :
 * insister sur une clé invalide ne fait que perdre du temps.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { attempts?: number; onWait?: (ms: number, attempt: number) => void } = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isRetryable =
        error instanceof LlmError && error.retryable && error.kind !== 'bad_output';
      if (!isRetryable || attempt === attempts) break;

      // L'API indique souvent le délai à respecter : on le suit plutôt que
      // de deviner. Sinon, doublement classique.
      const hinted = /retry in ([\d.]+)\s*s/i.exec((error as Error).message)?.[1];
      const waitMs = hinted ? Math.ceil(Number(hinted) * 1000) + 500 : 2000 * 2 ** (attempt - 1);
      options.onWait?.(waitMs, attempt);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError;
}

/**
 * Parse la sortie d'un modèle en tolérant les écarts les plus courants.
 *
 * Même sous contrainte de schéma, certains modèles encadrent le JSON de
 * balises markdown. On nettoie plutôt que d'échouer, mais on ne devine jamais
 * le contenu : si rien ne parse, on lève une LlmError `bad_output` avec le
 * texte brut pour que le diagnostic reste possible.
 */
export function parseJsonOutput<T>(provider: string, raw: string): T {
  const attempts = [
    raw,
    raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''),
    raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1),
  ];

  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // essai suivant
    }
  }

  throw new LlmError(
    provider,
    'bad_output',
    `Réponse non parsable en JSON. Texte brut : ${raw.slice(0, 300)}`,
    true
  );
}
