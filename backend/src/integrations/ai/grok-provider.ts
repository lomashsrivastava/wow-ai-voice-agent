/**
 * Grok AI Provider — xAI via OpenAI-compatible API
 */
import OpenAI from 'openai';
import { BaseAIProvider } from './base-provider.js';
import type { AIProvider, AIGenerateRequest, AIGenerateResponse, AIProviderError, ProviderName } from './types.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export class GrokProvider extends BaseAIProvider implements AIProvider {
  public readonly name: ProviderName = 'grok';
  private client: OpenAI | null = null;

  constructor() {
    super(config.grok.cooldownSeconds);
    this.initHealth();

    if (config.grok.apiKey) {
      this.client = new OpenAI({
        apiKey: config.grok.apiKey,
        baseURL: 'https://api.x.ai/v1',
      });
      logger.info({ provider: 'grok', model: config.grok.model }, 'Grok provider initialized');
    } else {
      this.health.status = 'unavailable';
      logger.warn('Grok provider: No API key configured');
    }
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    if (!this.client) {
      throw this.createError('auth_error', 'Grok API key not configured');
    }

    const start = Date.now();

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = request.messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const completion = await this.client.chat.completions.create({
        model: config.grok.model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      });

      const text = completion.choices[0]?.message?.content || '';
      const latencyMs = Date.now() - start;

      this.recordSuccess();
      logger.debug({ provider: 'grok', latencyMs, model: config.grok.model }, 'AI_PROVIDER_SUCCESS');

      return {
        content: text,
        provider: 'grok',
        model: config.grok.model,
        latencyMs,
        tokensUsed: {
          prompt: completion.usage?.prompt_tokens,
          completion: completion.usage?.completion_tokens,
          total: completion.usage?.total_tokens,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const statusCode = err?.status || err?.statusCode;
      const message = err?.message || String(err);
      const errorType = this.classifyError(statusCode, message);

      const providerError: AIProviderError = {
        provider: 'grok',
        type: errorType,
        message,
        statusCode,
        retryable: errorType !== 'auth_error',
      };

      this.recordFailure(providerError);
      logger.warn({ provider: 'grok', errorType, statusCode, latencyMs }, `AI_PROVIDER_FAILED: ${message}`);
      throw providerError;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.chat.completions.create({
        model: config.grok.model,
        messages: [{ role: 'user', content: 'Respond with only the word: OK' }],
        max_tokens: 5,
      });
      return !!result.choices[0]?.message?.content;
    } catch {
      return false;
    }
  }

  private createError(type: AIProviderError['type'], message: string): AIProviderError {
    return { provider: 'grok', type, message, retryable: false };
  }
}
