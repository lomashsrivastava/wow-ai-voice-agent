/**
 * Gemini AI Provider — Google Generative AI
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIProvider } from './base-provider.js';
import type { AIProvider, AIGenerateRequest, AIGenerateResponse, AIProviderError, ProviderName } from './types.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export class GeminiProvider extends BaseAIProvider implements AIProvider {
  public readonly name: ProviderName = 'gemini';
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    super(config.gemini.cooldownSeconds);
    this.initHealth();

    if (config.gemini.apiKey) {
      this.client = new GoogleGenerativeAI(config.gemini.apiKey);
      logger.info({ provider: 'gemini', model: config.gemini.model }, 'Gemini provider initialized');
    } else {
      this.health.status = 'unavailable';
      logger.warn('Gemini provider: No API key configured');
    }
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    if (!this.client) {
      throw this.createError('auth_error', 'Gemini API key not configured');
    }

    const start = Date.now();

    try {
      const model = this.client.getGenerativeModel({ model: config.gemini.model });

      // Build contents from messages
      const systemInstruction = request.messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n');

      const systemInstructionConfig = systemInstruction
        ? { parts: [{ text: systemInstruction }] }
        : undefined;

      const chatMessages = request.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' as const : 'user' as const,
          parts: [{ text: m.content }],
        }));

      // Use last user message as the prompt, previous as history
      const history = chatMessages.slice(0, -1);
      const lastMessage = chatMessages[chatMessages.length - 1];

      const chat = model.startChat({
        history,
        systemInstruction: systemInstructionConfig,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 2048,
        },
      });

      const result = await chat.sendMessage(lastMessage.parts[0].text);
      const response = result.response;
      const text = response.text();
      const latencyMs = Date.now() - start;

      this.recordSuccess();
      logger.debug({ provider: 'gemini', latencyMs, model: config.gemini.model }, 'AI_PROVIDER_SUCCESS');

      return {
        content: text,
        provider: 'gemini',
        model: config.gemini.model,
        latencyMs,
        tokensUsed: {
          prompt: response.usageMetadata?.promptTokenCount,
          completion: response.usageMetadata?.candidatesTokenCount,
          total: response.usageMetadata?.totalTokenCount,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const statusCode = err?.status || err?.statusCode;
      const message = err?.message || String(err);
      const errorType = this.classifyError(statusCode, message);

      const providerError: AIProviderError = {
        provider: 'gemini',
        type: errorType,
        message,
        statusCode,
        retryable: errorType !== 'auth_error',
      };

      this.recordFailure(providerError);
      logger.warn({ provider: 'gemini', errorType, statusCode, latencyMs }, `AI_PROVIDER_FAILED: ${message}`);
      throw providerError;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const model = this.client.getGenerativeModel({ model: config.gemini.model });
      const result = await model.generateContent('Respond with only the word: OK');
      return !!result.response.text();
    } catch {
      return false;
    }
  }

  private createError(type: AIProviderError['type'], message: string): AIProviderError {
    return { provider: 'gemini', type, message, retryable: false };
  }
}
