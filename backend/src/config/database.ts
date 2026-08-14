/**
 * MongoDB Database Connection
 */
import { MongoClient, Db } from 'mongodb';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  if (!config.mongodb.uri) {
    logger.warn('MONGODB_URI not configured. Database features unavailable.');
    throw new Error('MONGODB_URI not configured');
  }

  try {
    // SAFETY: Never log the full URI (contains credentials)
    logger.info({ dbName: config.mongodb.dbName }, 'Connecting to MongoDB...');

    client = new MongoClient(config.mongodb.uri);
    await client.connect();
    db = client.db(config.mongodb.dbName);

    // Verify connection
    await db.admin().ping();
    logger.info({ dbName: config.mongodb.dbName }, 'MongoDB connected successfully');

    // Create indexes
    await createIndexes(db);

    return db;
  } catch (err: any) {
    logger.error({ error: err.message }, 'MongoDB connection failed');
    throw err;
  }
}

export function getDB(): Db | null {
  return db;
}

export async function disconnectDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB disconnected');
  }
}

async function createIndexes(database: Db): Promise<void> {
  try {
    // Leads collection
    const leads = database.collection('leads');
    await leads.createIndex({ phone: 1 });
    await leads.createIndex({ qualificationStatus: 1 });
    await leads.createIndex({ 'leadScore.total': -1 });
    await leads.createIndex({ createdAt: -1 });

    // Conversations collection
    const conversations = database.collection('conversations');
    await conversations.createIndex({ leadId: 1 });
    await conversations.createIndex({ createdAt: -1 });
    await conversations.createIndex({ status: 1 });

    // Provider events collection
    const providerEvents = database.collection('provider_events');
    await providerEvents.createIndex({ provider: 1, timestamp: -1 });
    await providerEvents.createIndex({ timestamp: -1 });

    // Callbacks collection
    const callbacks = database.collection('callbacks');
    await callbacks.createIndex({ leadId: 1 });
    await callbacks.createIndex({ scheduledAt: 1, status: 1 });

    logger.info('MongoDB indexes created');
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Index creation warning (may already exist)');
  }
}
