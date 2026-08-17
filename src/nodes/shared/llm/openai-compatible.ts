/**
 * Fournisseur « OpenAI-compatible » — couvre OpenAI, OpenRouter, Groq,
 * Together, LM Studio, vLLM, et tout serveur exposant /v1/chat/completions.
 *
 * ============================================================================
 * API RÉELLEMENT OBSERVÉE (probe : `scripts/probe-openai-compatible.mjs`)
 *   base   : https://openrouter.ai/api/v1
 *   modèle : openrouter/free (routeur, tarif 0)
 *
 *   Réponse (clés racine) : id, object, created, model, provider,
 *                           system_fingerprint, service_tier, choices, usage
 *   choices[0]            : index, logprobs, finish_reason,
 *                           native_finish_reason, message
 *   usage                 : prompt_tokens, completion_tokens, total_tokens,
 *                           cost, is_byok, prompt_tokens_details{...},
 *                           cost_details{...},
 *                           completion_tokens_details{ reasoning_tokens, ... }
 *
 * FAITS MESURÉS
 *  1. `response_format: { type: 'json_schema', strict: true }` FONCTIONNE et
 *     respecte l'`enum` : la réponse est revenue exactement sur une valeur
 *     autorisée ("missing_context").
 *  2. `response_format: { type: 'json_object' }` NE SUFFIT PAS : le modèle a
 *     renvoyé `confidence_score: 95` au lieu de 0.95 — hors plage, exactement
 *     la même dérive qu'observée sur Ollama en mode json simple. Le schéma
 *     complet n'est donc pas optionnel.
 *  3. OpenRouter renvoie le COÛT RÉEL dans `usage.cost`, et le fournisseur
 *     amont réellement sollicité dans `provider` — indispensable derrière un
 *     routeur, où `openrouter/free` peut servir depuis n'importe quel modèle.
 *  4. `completion_tokens_details.reasoning_tokens` peut dépasser le nombre de
 *     tokens de réponse (277 de raisonnement pour 303 de sortie).
 * ============================================================================
 */

import { LlmError, parseJsonOutput, type LlmClient, type LlmRequest, type LlmResponse } from './types.ts';

export interface OpenAiCompatibleOptions {
  apiKey: string;
  model: string;
  /** Ex. https://api.openai.com/v1 ou https://openrouter.ai/api/v1 */
  baseUrl: string;
  /** Nom lisible du fournisseur, pour les messages d'erreur et les rapports. */
  providerName?: string;
  timeoutMs?: number;
  /** En-têtes additionnels (OpenRouter recommande HTTP-Referer et X-Title). */
  extraHeaders?: Record<string, string>;
}

interface OpenAiResponseBody {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    /** OpenRouter : coût réel de l'appel en dollars. */
    cost?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  /** OpenRouter : fournisseur amont ayant réellement servi la requête. */
  provider?: string;
  /** Modèle réellement utilisé (peut différer derrière un routeur). */
  model?: string;
  error?: { message?: string; type?: string; code?: string };
}

export class OpenAiCompatibleClient implements LlmClient {
  readonly provider: string;
  readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly extraHeaders: Record<string, string>;

  constructor(options: OpenAiCompatibleOptions) {
    if (!options.apiKey) {
      throw new LlmError(
        options.providerName ?? 'openai',
        'auth',
        'Clé API manquante pour le fournisseur OpenAI-compatible.',
        false
      );
    }
    this.provider = options.providerName ?? 'openai';
    this.model = options.model;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.extraHeaders = options.extraHeaders ?? {};
  }

  async complete<T>(request: LlmRequest): Promise<LlmResponse<T>> {
    const started = Date.now();

    // `strict: true` impose additionalProperties:false et required exhaustif.
    const strictSchema = {
      ...request.schema,
      additionalProperties: false,
      required: Object.keys(request.schema.properties),
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
          ...this.extraHeaders,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: request.temperature ?? 0,
          ...(request.maxOutputTokens ? { max_completion_tokens: request.maxOutputTokens } : {}),
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'vulnpipe_verdict', strict: true, schema: strictSchema },
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new LlmError(
        this.provider,
        'unavailable',
        `Appel ${this.provider} impossible : ${(error as Error).message}`,
        true
      );
    }

    const json = (await response.json()) as OpenAiResponseBody;

    if (json.error || !response.ok) {
      const message = json.error?.message ?? `HTTP ${response.status}`;
      const kind =
        response.status === 429
          ? 'rate_limit'
          : response.status === 401 || response.status === 403
            ? 'auth'
            : response.status >= 500
              ? 'unavailable'
              : 'unknown';
      throw new LlmError(this.provider, kind, `${this.provider} : ${message}`, kind !== 'auth');
    }

    const raw = json.choices?.[0]?.message?.content ?? '';
    if (!raw) {
      throw new LlmError(
        this.provider,
        'bad_output',
        `Réponse vide (finish_reason=${json.choices?.[0]?.finish_reason ?? 'inconnu'}).`,
        true
      );
    }

    return {
      parsed: parseJsonOutput<T>(this.provider, raw),
      raw,
      provider: this.provider,
      model: this.model,
      usage: {
        input_tokens: json.usage?.prompt_tokens ?? 0,
        output_tokens: json.usage?.completion_tokens ?? 0,
        thinking_tokens: json.usage?.completion_tokens_details?.reasoning_tokens,
        cost_usd: json.usage?.cost,
        upstream_provider: json.provider,
        resolved_model: json.model,
      },
      latency_ms: Date.now() - started,
    };
  }
}
