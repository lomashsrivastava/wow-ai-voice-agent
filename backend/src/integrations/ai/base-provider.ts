/**
 * Base AI Provider — Shared logic for health tracking, cooldowns, error classification.
 */
import type { AIProvider, ProviderName, ProviderStatus, ProviderHealthState, AIProviderError } from './types.js';

export abstract class BaseAIProvider implements Partial<AIProvider> {
  public abstract readonly name: ProviderName;

  protected health: ProviderHealthState;
  protected cooldownSeconds: number;

  constructor(cooldownSeconds: number = 300) {
    this.cooldownSeconds = cooldownSeconds;
    this.health = {
      provider: 'demo' as ProviderName, // overridden by subclass
      status: 'available',
      cooldownUntil: null,
      lastSuccess: null,
      lastFailure: null,
      failureCount: 0,
      requestCount: 0,
      consecutiveFailures: 0,
    };
  }

  protected initHealth(): void {
    this.health.provider = this.name;
  }

  /** Record a successful request */
  protected recordSuccess(): void {
    this.health.status = 'available';
    this.health.lastSuccess = new Date();
    this.health.requestCount++;
    this.health.consecutiveFailures = 0;
  }

  /** Record a failed request and determine cooldown */
  protected recordFailure(error: AIProviderError): void {
    this.health.lastFailure = new Date();
    this.health.failureCount++;
    this.health.requestCount++;
    this.health.consecutiveFailures++;

    switch (error.type) {
      case 'rate_limit':
        this.health.status = 'rate_limited';
        this.setCooldown(60); // 1 minute for rate limits
        break;
      case 'quota_exhausted':
        this.health.status = 'quota_exhausted';
        this.setCooldown(this.cooldownSeconds); // Full cooldown
        break;
      case 'timeout':
      case 'server_error':
      case 'network_error':
        this.health.status = 'temporary_failure';
        // Exponential backoff: 10s, 20s, 40s, max 5 min
        const backoff = Math.min(10 * Math.pow(2, this.health.consecutiveFailures - 1), 300);
        this.setCooldown(backoff);
        break;
      case 'auth_error':
        this.health.status = 'unavailable';
        break;
      default:
        this.health.status = 'temporary_failure';
        this.setCooldown(30);
    }
  }

  /** Set a cooldown period (provider won't be selected during this time) */
  protected setCooldown(seconds: number): void {
    this.health.cooldownUntil = new Date(Date.now() + seconds * 1000);
  }

  /** Check if provider is past its cooldown */
  public isAvailable(): boolean {
    if (this.health.status === 'unavailable') return false;
    if (this.health.cooldownUntil && new Date() < this.health.cooldownUntil) return false;

    // If cooldown has expired, reset status to available
    if (this.health.cooldownUntil && new Date() >= this.health.cooldownUntil) {
      this.health.status = 'available';
      this.health.cooldownUntil = null;
      this.health.consecutiveFailures = 0;
    }
    return true;
  }

  public getHealth(): ProviderHealthState {
    // Refresh availability check
    this.isAvailable();
    return { ...this.health };
  }

  /**
   * Classify HTTP errors into our error taxonomy.
   */
  protected classifyError(statusCode: number | undefined, message: string): AIProviderError['type'] {
    if (statusCode === 429) return 'rate_limit';
    if (statusCode === 401 || statusCode === 403) return 'auth_error';
    if (statusCode === 503 || statusCode === 502 || statusCode === 500) return 'server_error';
    if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('resource_exhausted') || message.toLowerCase().includes('resource exhausted')) return 'quota_exhausted';
    if (message.toLowerCase().includes('rate') && message.toLowerCase().includes('limit')) return 'rate_limit';
    if (message.toLowerCase().includes('timeout') || message.toLowerCase().includes('timed out')) return 'timeout';
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('econnrefused') || message.toLowerCase().includes('fetch failed')) return 'network_error';
    return 'unknown';
  }
}
