/**
 * WOW AI Voice Agent — Main Server
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config, validateConfig } from './config/index.js';
import { connectDB } from './config/database.js';
import { logger } from './utils/logger.js';
import { healthRoutes } from './routes/health.js';
import { leadRoutes } from './routes/leads.js';
import { conversationRoutes } from './routes/conversations.js';
import { getAIProviderManager } from './integrations/ai/index.js';

async function main(): Promise<void> {
  // Validate config
  const { errors, warnings } = validateConfig();
  for (const w of warnings) logger.warn(w);
  if (errors.length > 0) {
    for (const e of errors) logger.error(e);
    process.exit(1);
  }

  // Create Fastify app
  const app = Fastify({ logger: false }); // We use our own pino logger

  // CORS
  await app.register(cors, {
    origin: config.env === 'production'
      ? ['https://wow-ai-voice-agent.netlify.app']
      : true, // Allow all in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Connect to MongoDB
  try {
    await connectDB();
  } catch (err: any) {
    logger.warn('MongoDB not available — running in degraded mode');
  }

  // Initialize AI Provider Manager (triggers provider initialization)
  const aiManager = getAIProviderManager();
  const providerStatus = aiManager.getProviderStatus();
  logger.info({
    currentProvider: providerStatus.currentProvider,
    providerChain: Object.entries(providerStatus.providers)
      .map(([name, h]) => `${name}:${h.status}`)
      .join(', '),
  }, 'AI Provider chain ready');

  // Register routes
  await app.register(async (instance) => {
    await healthRoutes(instance);
    await leadRoutes(instance);
    await conversationRoutes(instance);
  });

  // Start server
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info(`
╔══════════════════════════════════════════════════╗
║   WOW AI Voice Agent — Backend Server            ║
║   Port: ${config.port}                                    ║
║   Environment: ${config.env.padEnd(33)}║
║   API: http://localhost:${config.port}/api/health          ║
╚══════════════════════════════════════════════════╝`);
  } catch (err) {
    logger.error(err, 'Server failed to start');
    process.exit(1);
  }
}

main().catch(err => {
  logger.error(err, 'Fatal error');
  process.exit(1);
});
