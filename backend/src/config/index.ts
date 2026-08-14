import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load .env — search upwards from backend/src/config/ to find project root .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.resolve(__dirname, '../../../.env'),     // project-root/.env (from src/config/)
  path.resolve(__dirname, '../../.env'),        // backend/.env
  path.resolve(process.cwd(), '../.env'),       // parent of cwd
  path.resolve(process.cwd(), '.env'),          // cwd
];
const envPath = envPaths.find(p => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // fallback to default
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB_NAME || 'wowai',
  },

  // AI Provider strategy
  ai: {
    primaryProvider: process.env.AI_PRIMARY_PROVIDER || 'gemini',
    secondaryProvider: process.env.AI_SECONDARY_PROVIDER || 'grok',
    localFallback: process.env.AI_LOCAL_FALLBACK || 'ollama',
    demoFallback: process.env.AI_DEMO_FALLBACK === 'true',
  },

  // Gemini
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    cooldownSeconds: parseInt(process.env.GEMINI_COOLDOWN_SECONDS || '300', 10),
  },

  // Grok / xAI
  grok: {
    apiKey: process.env.GROK_API_KEY || '',
    model: process.env.GROK_MODEL || 'grok-3-mini',
    cooldownSeconds: parseInt(process.env.GROK_COOLDOWN_SECONDS || '300', 10),
  },

  // Ollama
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
  },

  // Voice
  voice: {
    provider: process.env.VOICE_PROVIDER || 'vapi',
    apiKey: process.env.VOICE_API_KEY || '',
    demoMode: process.env.VOICE_DEMO_MODE === 'true',
  },
} as const;

/**
 * Validate that required config values are present.
 * Returns list of warnings (non-blocking) for missing optional values.
 */
export function validateConfig(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // At least one AI provider must be configured
  if (!config.gemini.apiKey && !config.grok.apiKey) {
    warnings.push('No AI API keys configured. Only Ollama/Demo mode available.');
  }
  if (!config.gemini.apiKey) {
    warnings.push('GEMINI_API_KEY not set. Gemini provider unavailable.');
  }
  if (!config.grok.apiKey) {
    warnings.push('GROK_API_KEY not set. Grok provider unavailable.');
  }
  if (!config.mongodb.uri) {
    warnings.push('MONGODB_URI not set. Database features unavailable.');
  }
  if (!config.voice.apiKey && !config.voice.demoMode) {
    warnings.push('VOICE_API_KEY not set and VOICE_DEMO_MODE is false. Voice features unavailable.');
  }

  return { errors, warnings };
}
