/**
 * AI Provider Manager — Intelligent Provider Failover System
 * 
 * Handles automatic provider switching with:
 * - Configurable priority order (Gemini → Grok → Ollama → Demo)
 * - Health tracking per provider
 * - Cooldown management (no hammering exhausted providers)
 * - Finite retry per request (no infinite loops)
 * - Invisible switching (conversation context preserved)
 * - Safe logging (no secrets)
 */
import type { AIProvider, AIGenerateRequest, AIGenerateResponse, ProviderName, ProviderHealthState, AIProviderError } from './types.js';
import { GeminiProvider } from './gemini-provider.js';
import { GrokProvider } from './grok-provider.js';
import { OllamaProvider } from './ollama-provider.js';
import { DemoProvider } from './demo-provider.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class AIProviderManager {
  private providers: Map<ProviderName, AIProvider> = new Map();
  private providerOrder: ProviderName[];
  private currentProvider: ProviderName | null = null;

  /** Track per-request metrics */
  private totalRequests = 0;
  private totalSuccesses = 0;
  private totalFailovers = 0;

  constructor() {
    // Initialize all providers
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('grok', new GrokProvider());
    this.providers.set('ollama', new OllamaProvider());
    this.providers.set('demo', new DemoProvider());

    // Build priority order from config
    this.providerOrder = [
      config.ai.primaryProvider as ProviderName,
      config.ai.secondaryProvider as ProviderName,
      config.ai.localFallback as ProviderName,
    ];
    if (config.ai.demoFallback) {
      this.providerOrder.push('demo');
    }

    // Deduplicate
    this.providerOrder = [...new Set(this.providerOrder)];

    logger.info(
      { order: this.providerOrder },
      'AI Provider Manager initialized with failover chain'
    );
  }

  /**
   * Generate a response using the best available provider.
   * Tries providers in priority order. Each provider is attempted AT MOST ONCE per request.
   * No infinite loops.
   */
  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    this.totalRequests++;
    const attemptedProviders: ProviderName[] = [];
    let lastError: AIProviderError | null = null;

    for (const providerName of this.providerOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      // Skip if provider is in cooldown or unavailable
      if (!provider.isAvailable()) {
        const health = provider.getHealth();
        logger.debug(
          { provider: providerName, status: health.status, cooldownUntil: health.cooldownUntil },
          'AI_PROVIDER_SKIPPED: Not available'
        );
        continue;
      }

      // Don't retry a provider we already tried this request
      if (attemptedProviders.includes(providerName)) continue;
      attemptedProviders.push(providerName);

      try {
        // Log provider selection
        if (this.currentProvider && this.currentProvider !== providerName) {
          this.totalFailovers++;
          logger.info(
            { from: this.currentProvider, to: providerName },
            `AI_PROVIDER_SWITCHED: ${this.currentProvider} -> ${providerName}`
          );
        }
        this.currentProvider = providerName;

        const response = await provider.generate(request);
        this.totalSuccesses++;

        logger.info(
          { provider: providerName, model: response.model, latencyMs: response.latencyMs },
          'AI_PROVIDER_SELECTED'
        );

        return response;
      } catch (err) {
        lastError = err as AIProviderError;
        logger.warn(
          { provider: providerName, error: lastError.type, message: lastError.message },
          `AI_PROVIDER_FAILED: Trying next provider`
        );
        // Continue to next provider
      }
    }

    // All providers exhausted
    logger.error(
      { attempted: attemptedProviders, lastError: lastError?.type },
      'ALL_PROVIDERS_EXHAUSTED: No AI provider available'
    );

    throw new Error(
      `All AI providers exhausted. Attempted: ${attemptedProviders.join(', ')}. ` +
      `Last error: ${lastError?.message || 'unknown'}`
    );
  }

  /**
   * Get health status of all providers.
   * Safe for dashboard display — no secrets exposed.
   */
  getProviderStatus(): {
    providers: Record<ProviderName, ProviderHealthState>;
    currentProvider: ProviderName | null;
    stats: {
      totalRequests: number;
      totalSuccesses: number;
      totalFailovers: number;
    };
  } {
    const providers: Record<string, ProviderHealthState> = {};
    for (const [name, provider] of this.providers) {
      providers[name] = provider.getHealth();
    }

    return {
      providers: providers as Record<ProviderName, ProviderHealthState>,
      currentProvider: this.currentProvider,
      stats: {
        totalRequests: this.totalRequests,
        totalSuccesses: this.totalSuccesses,
        totalFailovers: this.totalFailovers,
      },
    };
  }

  /**
   * Run health checks on all providers.
   */
  async healthCheckAll(): Promise<Record<ProviderName, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }
    return results as Record<ProviderName, boolean>;
  }

  /**
   * Get a specific provider for direct use (testing/admin only).
   */
  getProvider(name: ProviderName): AIProvider | undefined {
    return this.providers.get(name);
  }
}

// Singleton instance
let _instance: AIProviderManager | null = null;

export function getAIProviderManager(): AIProviderManager {
  if (!_instance) {
    _instance = new AIProviderManager();
  }
  return _instance;
}
