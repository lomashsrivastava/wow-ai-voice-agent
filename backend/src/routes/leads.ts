/**
 * Leads API Routes
 */
import type { FastifyInstance } from 'fastify';
import { getDB } from '../config/database.js';
import { LeadSchema, type Lead, calculateLeadScore, getQualificationStatus } from '../schemas/index.js';
import { ObjectId } from 'mongodb';
import { logger } from '../utils/logger.js';

export async function leadRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/leads — List all leads
  app.get('/api/leads', async (_request, _reply) => {
    const db = getDB();
    if (!db) return { error: 'Database not connected', leads: [] };

    const leads = await db.collection('leads')
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return { leads, total: leads.length };
  });

  // GET /api/leads/:id — Get single lead
  app.get<{ Params: { id: string } }>('/api/leads/:id', async (request, reply) => {
    const db = getDB();
    if (!db) return reply.status(503).send({ error: 'Database not connected' });

    const { id } = request.params;
    let lead;
    try {
      lead = await db.collection('leads').findOne({ _id: new ObjectId(id) });
    } catch {
      return reply.status(400).send({ error: 'Invalid lead ID' });
    }

    if (!lead) return reply.status(404).send({ error: 'Lead not found' });
    return lead;
  });

  // POST /api/leads — Create a new lead
  app.post('/api/leads', async (request, reply) => {
    const db = getDB();
    if (!db) return reply.status(503).send({ error: 'Database not connected' });

    try {
      const data = LeadSchema.parse(request.body);

      // Calculate score server-side (never trust client scores)
      const score = calculateLeadScore({
        intent: data.intent,
        locationFit: data.locationFit,
        budgetNumeric: data.budgetNumeric,
        timelineFit: data.timelineFit,
      });
      data.leadScore = score;
      data.qualificationStatus = getQualificationStatus(score.total);
      data.updatedAt = new Date();

      const result = await db.collection('leads').insertOne(data);
      logger.info({ leadId: result.insertedId, score: score.total, status: data.qualificationStatus }, 'Lead created');

      return reply.status(201).send({ id: result.insertedId, ...data });
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Lead creation validation failed');
      return reply.status(400).send({ error: 'Validation failed', details: err.errors || err.message });
    }
  });

  // GET /api/analytics — Dashboard analytics
  app.get('/api/analytics', async (_request, _reply) => {
    const db = getDB();
    if (!db) return { error: 'Database not connected' };

    const leadsCol = db.collection('leads');
    const [totalLeads, hotLeads, warmLeads, nurtureLeads, callbackLeads] = await Promise.all([
      leadsCol.countDocuments(),
      leadsCol.countDocuments({ qualificationStatus: 'HOT' }),
      leadsCol.countDocuments({ qualificationStatus: 'WARM' }),
      leadsCol.countDocuments({ qualificationStatus: 'NURTURE' }),
      leadsCol.countDocuments({ callbackRequested: true }),
    ]);

    const avgDurationResult = await leadsCol.aggregate([
      { $group: { _id: null, avgDuration: { $avg: '$callDuration' } } },
    ]).toArray();

    return {
      totalLeads,
      hotLeads,
      warmLeads,
      nurtureLeads,
      callbackLeads,
      averageCallDuration: avgDurationResult[0]?.avgDuration || 0,
    };
  });
}
