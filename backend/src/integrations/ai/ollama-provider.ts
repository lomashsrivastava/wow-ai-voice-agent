/**
 * Ollama AI Provider — Local LLM fallback
 */
import { BaseAIProvider } from './base-provider.js';
import type { AIProvider, AIGenerateRequest, AIGenerateResponse, AIProviderError, ProviderName } from './types.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export class OllamaProvider extends BaseAIProvider implements AIProvider {
  public readonly name: ProviderName = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor() {
    super(60); // 1-minute cooldown for local provider
    this.initHealth();
    this.baseUrl = config.ollama.baseUrl;
    this.model = config.ollama.model;
    logger.info({ provider: 'ollama', model: this.model, baseUrl: this.baseUrl }, 'Ollama provider initialized');
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const start = Date.now();

    try {
      // Build a single prompt from messages for Ollama /api/chat
      const messages = request.messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json() as any;
      const text = data.message?.content || '';
      const latencyMs = Date.now() - start;

      this.recordSuccess();
      logger.debug({ provider: 'ollama', latencyMs, model: this.model }, 'AI_PROVIDER_SUCCESS');

      return {
        content: text,
        provider: 'ollama',
        model: this.model,
        latencyMs,
        tokensUsed: {
          prompt: data.prompt_eval_count,
          completion: data.eval_count,
          total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const message = err?.message || String(err);
      const errorType = this.classifyError(undefined, message);

      const providerError: AIProviderError = {
        provider: 'ollama',
        type: errorType,
        message,
        retryable: true,
      };

      this.recordFailure(providerError);
      logger.warn({ provider: 'ollama', errorType, latencyMs }, `AI_PROVIDER_FAILED: ${message}`);
      throw providerError;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return false;
      const data = await response.json() as any;
      // Check if our model is available
      const models = data.models || [];
      return models.some((m: any) => m.name === this.model || m.name.startsWith(this.model.split(':')[0]));
    } catch {
      return false;
    }
  }
}
