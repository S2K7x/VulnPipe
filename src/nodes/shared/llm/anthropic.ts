/**
 * Fournisseur Anthropic (Claude) via le SDK officiel `@anthropic-ai/sdk`.
 *
 * Deux usages dans VulnPipe :
 *  - comme moteur d'un node de détection, si l'utilisateur préfère payer
 *    plutôt que faire tourner un modèle local ;
 *  - comme master en Phase 5, appelé par l'Agrégateur (CLAUDE.md §2).
 *
 * ============================================================================
 * CONTRAINTES D'API À NE PAS OUBLIER (SDK 0.117.1)
 *
 *  1. `temperature` est REFUSÉ (HTTP 400) sur les modèles récents
 *     (Opus 5, Sonnet 5, Opus 4.7/4.8). C'est le piège n°1 d'une couche
 *     multi-fournisseurs : le contrat `LlmRequest` porte un `temperature`
 *     que Gemini, Ollama et OpenAI acceptent — ici il doit être IGNORÉ,
 *     pas transmis. Le déterminisme se pilote par le prompt.
 *  2. Le prefill de tour assistant (« {"vulnerability": ») est également
 *     refusé sur ces modèles. Pour contraindre le JSON, on passe par
 *     `output_config.format` (sorties structurées), pas par un prefill.
 *  3. `max_tokens` : ~16000 en non-streaming (au-delà, risque de timeout HTTP
 *     côté SDK). On reste sous ce seuil, un verdict est court.
 *  4. La pensée est active par défaut sur Opus 5 et compte dans `max_tokens`.
 * ============================================================================
 */

import Anthropic from '@anthropic-ai/sdk';

import { LlmError, parseJsonOutput, type LlmClient, type LlmRequest, type LlmResponse } from './types.ts';

/** Modèle par défaut : le plus capable, cf. rôle d'arbitre en Phase 5. */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5';

export interface AnthropicOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicClient implements LlmClient {
  readonly provider = 'anthropic';
  readonly model: string;

  private readonly client: Anthropic;
  private readonly maxTokens: number;

  constructor(options: AnthropicOptions = {}) {
    // Le SDK résout aussi ANTHROPIC_API_KEY / profil `ant auth login` seul.
    this.client = options.apiKey ? new Anthropic({ apiKey: options.apiKey }) : new Anthropic();
    this.model = options.model ?? DEFAULT_ANTHROPIC_MODEL;
    this.maxTokens = options.maxTokens ?? 8_000;
  }

  async complete<T>(request: LlmRequest): Promise<LlmResponse<T>> {
    const started = Date.now();

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: request.system,
        messages: [{ role: 'user', content: request.user }],
        // Sorties structurées — remplace le prefill, refusé sur ces modèles.
        output_config: {
          format: {
            type: 'json_schema',
            schema: { ...request.schema, additionalProperties: false },
          },
        },
        // `temperature` volontairement ABSENT : 400 sur les modèles récents.
      } as Anthropic.MessageCreateParamsNonStreaming);

      if (message.stop_reason === 'refusal') {
        throw new LlmError(
          'anthropic',
          'bad_output',
          "Claude a refusé la requête (classificateurs de sécurité). L'analyse n'a pas eu lieu : ne pas considérer cette route comme saine.",
          false
        );
      }

      const raw = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      if (!raw) {
        throw new LlmError(
          'anthropic',
          'bad_output',
          `Réponse sans texte (stop_reason=${message.stop_reason}).`,
          true
        );
      }

      return {
        parsed: parseJsonOutput<T>('anthropic', raw),
        raw,
        provider: this.provider,
        model: this.model,
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
        },
        latency_ms: Date.now() - started,
      };
    } catch (error) {
      if (error instanceof LlmError) throw error;

      // Exceptions typées du SDK — jamais de comparaison de chaînes.
      if (error instanceof Anthropic.AuthenticationError) {
        throw new LlmError('anthropic', 'auth', 'Clé API Anthropic invalide ou absente.', false);
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new LlmError('anthropic', 'rate_limit', 'Quota Anthropic dépassé.', true);
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new LlmError('anthropic', 'unavailable', 'API Anthropic injoignable.', true);
      }
      if (error instanceof Anthropic.APIError) {
        throw new LlmError(
          'anthropic',
          error.status && error.status >= 500 ? 'unavailable' : 'unknown',
          `Anthropic ${error.status} : ${error.message}`,
          !!error.status && error.status >= 500
        );
      }
      throw new LlmError('anthropic', 'unknown', (error as Error).message, false);
    }
  }
}
