/**
 * AI Provider Abstraction Layer
 * 
 * Defines the interface all AI providers must implement,
 * plus types for health tracking and provider management.
 */

export type ProviderName = 'gemini' | 'grok' | 'ollama' | 'demo';

export type ProviderStatus = 'available' | 'rate_limited' | 'quota_exhausted' | 'temporary_failure' | 'unavailable';

export interface ProviderHealthState {
  provider: ProviderName;
  status: ProviderStatus;
  cooldownUntil: Date | null;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  failureCount: number;
  requestCount: number;
  consecutiveFailures: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIGenerateRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  conversationId?: string;
}

export interface AIGenerateResponse {
  content: string;
  provider: ProviderName;
  model: string;
  latencyMs: number;
  tokensUsed?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
}

export interface AIProviderError {
  provider: ProviderName;
  type: 'rate_limit' | 'quota_exhausted' | 'timeout' | 'server_error' | 'network_error' | 'auth_error' | 'unknown';
  message: string;
  statusCode?: number;
  retryable: boolean;
}

/**
 * Base interface for all AI providers.
 * Each provider (Gemini, Grok, Ollama, Demo) must implement this.
 */
export interface AIProvider {
  readonly name: ProviderName;

  /** Generate a response from the AI model */
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>;

  /** Check if the provider is currently available */
  isAvailable(): boolean;

  /** Get the current health state */
  getHealth(): ProviderHealthState;

  /** Perform a lightweight health check */
  healthCheck(): Promise<boolean>;
}
