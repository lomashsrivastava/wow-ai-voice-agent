import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  transport: config.env !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined,
  // SAFETY: Never log secrets
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'apiKey',
      'password',
      'secret',
      'token',
      'GEMINI_API_KEY',
      'GROK_API_KEY',
      'MONGODB_URI',
    ],
    censor: '[REDACTED]',
  },
});
