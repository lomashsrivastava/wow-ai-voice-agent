/**
 * Conversation API Routes
 */
import type { FastifyInstance } from 'fastify';
import { getDB } from '../config/database.js';
import { getAIProviderManager } from '../integrations/ai/index.js';
import type { AIMessage } from '../integrations/ai/types.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { WOW_SYSTEM_PROMPT } from '../prompts/system-prompt.js';

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/conversations — Start a new conversation
  app.post('/api/conversations', async (request, reply) => {
    const db = getDB();
    const body = request.body as any;

    const conversationId = uuidv4();
    const conversation = {
      conversationId,
      leadId: body.leadId || null,
      status: 'active',
      currentStage: 'greeting',
      messages: [] as any[],
      extractedData: {},
      promptVersion: 'v1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (db) {
      await db.collection('conversations').insertOne(conversation);
    }

    logger.info({ conversationId }, 'Conversation started');
    return reply.status(201).send(conversation);
  });

  // POST /api/conversations/:id/message — Send a message in a conversation
  app.post<{ Params: { id: string } }>('/api/conversations/:id/message', async (request, reply) => {
    const db = getDB();
    const { id } = request.params;
    const body = request.body as any;
    const userMessage = body.message || '';

    // Load existing conversation
    let conversation: any = null;
    if (db) {
      conversation = await db.collection('conversations').findOne({ conversationId: id });
    }

    // Build message history for AI
    const messages: AIMessage[] = [
      { role: 'system', content: WOW_SYSTEM_PROMPT },
    ];

    if (conversation?.messages?.length) {
      for (const msg of conversation.messages) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user' as const, content: userMessage });

    // Generate AI response using provider manager (with failover)
    const aiManager = getAIProviderManager();
    try {
      const aiResponse = await aiManager.generate({
        messages,
        temperature: 0.7,
        maxTokens: 512,
        conversationId: id,
      });

      const timestamp = new Date().toISOString();

      // Store messages
      const newMessages = [
        { role: 'user', content: userMessage, timestamp, provider: '' },
        { role: 'assistant', content: aiResponse.content, timestamp, provider: aiResponse.provider },
      ];

      if (db && conversation) {
        await db.collection('conversations').updateOne(
          { conversationId: id },
          {
            $push: { messages: { $each: newMessages } } as any,
            $set: {
              updatedAt: new Date(),
              aiProvider: aiResponse.provider,
            },
          }
        );
      }

      logger.info({
        conversationId: id,
        provider: aiResponse.provider,
        model: aiResponse.model,
        latencyMs: aiResponse.latencyMs,
      }, 'Conversation message processed');

      return {
        conversationId: id,
        response: aiResponse.content,
        provider: aiResponse.provider,
        model: aiResponse.model,
        latencyMs: aiResponse.latencyMs,
      };
    } catch (err: any) {
      logger.error({ conversationId: id, error: err.message }, 'Conversation AI failure');
      return reply.status(503).send({
        error: 'All AI providers unavailable',
        message: 'Please try again in a few minutes.',
      });
    }
  });

  // GET /api/conversations/:id — Get conversation
  app.get<{ Params: { id: string } }>('/api/conversations/:id', async (request, reply) => {
    const db = getDB();
    if (!db) return reply.status(503).send({ error: 'Database not connected' });

    const { id } = request.params;
    const conversation = await db.collection('conversations').findOne({ conversationId: id });
    if (!conversation) return reply.status(404).send({ error: 'Conversation not found' });
    return conversation;
  });

  // GET /api/conversations — List conversations
  app.get('/api/conversations', async (_request, _reply) => {
    const db = getDB();
    if (!db) return { conversations: [], total: 0 };

    const conversations = await db.collection('conversations')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return { conversations, total: conversations.length };
  });
}
