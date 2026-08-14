/**
 * Health & Status Routes
 */
import type { FastifyInstance } from 'fastify';
import { getDB } from '../config/database.js';
import { getAIProviderManager } from '../integrations/ai/index.js';
import { config } from '../config/index.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/health — System health check
  app.get('/api/health', async (_request, _reply) => {
    const db = getDB();
    let dbStatus = 'disconnected';
    try {
      if (db) {
        await db.admin().ping();
        dbStatus = 'connected';
      }
    } catch {
      dbStatus = 'error';
    }

    const aiManager = getAIProviderManager();
    const providerStatus = aiManager.getProviderStatus();

    return {
      status: 'ok',
      version: '1.0.0',
      environment: config.env,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        ai: {
          currentProvider: providerStatus.currentProvider,
          stats: providerStatus.stats,
        },
        voice: {
          provider: config.voice.provider,
          demoMode: config.voice.demoMode,
        },
      },
    };
  });

  // GET /api/ai/providers/status — Detailed AI provider health
  app.get('/api/ai/providers/status', async (_request, _reply) => {
    const aiManager = getAIProviderManager();
    return aiManager.getProviderStatus();
  });
}
