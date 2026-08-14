/**
 * Lead & Qualification Schemas (Zod)
 */
import { z } from 'zod';

// --- Lead Score ---
export const LeadScoreSchema = z.object({
  intent: z.number().min(0).max(25).default(0),
  geography: z.number().min(0).max(25).default(0),
  budget: z.number().min(0).max(30).default(0),
  timeline: z.number().min(0).max(20).default(0),
  total: z.number().min(0).max(100).default(0),
});

export type LeadScore = z.infer<typeof LeadScoreSchema>;

// --- Qualification Status ---
export const QualificationStatusEnum = z.enum(['HOT', 'WARM', 'NURTURE', 'LOW_FIT', 'UNQUALIFIED']);
export type QualificationStatus = z.infer<typeof QualificationStatusEnum>;

// --- Intent ---
export const IntentEnum = z.enum(['self_use', 'investment', 'both', 'undecided', 'unknown']);
export type Intent = z.infer<typeof IntentEnum>;

// --- Lead ---
export const LeadSchema = z.object({
  _id: z.string().optional(),
  name: z.string().default('Unknown'),
  phone: z.string().default(''),
  language: z.enum(['english', 'hindi', 'hinglish', 'unknown']).default('unknown'),
  intent: IntentEnum.default('unknown'),
  locationFit: z.enum(['comfortable', 'somewhat', 'uncomfortable', 'unknown']).default('unknown'),
  budgetRange: z.string().default(''),
  budgetNumeric: z.number().nullable().default(null),
  timelineFit: z.enum(['comfortable', 'flexible', 'urgent', 'unknown']).default('unknown'),
  projectInterest: z.number().min(1).max(10).default(5),
  leadScore: LeadScoreSchema.default({
    intent: 0, geography: 0, budget: 0, timeline: 0, total: 0,
  }),
  qualificationStatus: QualificationStatusEnum.default('UNQUALIFIED'),
  objections: z.array(z.string()).default([]),
  questionsAsked: z.array(z.string()).default([]),
  callbackRequested: z.boolean().default(false),
  callbackPreference: z.string().nullable().default(null),
  consentStatus: z.enum(['granted', 'denied', 'pending']).default('pending'),
  callDuration: z.number().default(0),
  transcript: z.array(z.object({
    role: z.enum(['agent', 'user']),
    content: z.string(),
    timestamp: z.string(),
  })).default([]),
  summary: z.string().default(''),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Lead = z.infer<typeof LeadSchema>;

// --- Conversation ---
export const ConversationSchema = z.object({
  _id: z.string().optional(),
  leadId: z.string().nullable().default(null),
  status: z.enum(['active', 'completed', 'abandoned', 'failed']).default('active'),
  currentStage: z.enum([
    'greeting', 'permission', 'discovery', 'intent', 'geography',
    'budget', 'timeline', 'pitch', 'qualification', 'cta', 'callback', 'end',
  ]).default('greeting'),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
    timestamp: z.string(),
    provider: z.string().optional(),
  })).default([]),
  extractedData: z.record(z.unknown()).default({}),
  aiProvider: z.string().default(''),
  promptVersion: z.string().default('v1'),
  callDurationMs: z.number().default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// --- Callback ---
export const CallbackSchema = z.object({
  _id: z.string().optional(),
  leadId: z.string(),
  phone: z.string(),
  preferredTime: z.string().nullable().default(null),
  status: z.enum(['pending', 'scheduled', 'completed', 'failed']).default('pending'),
  notes: z.string().default(''),
  createdAt: z.date().default(() => new Date()),
});

export type Callback = z.infer<typeof CallbackSchema>;

/**
 * Calculate qualification status from total score.
 */
export function getQualificationStatus(totalScore: number): QualificationStatus {
  if (totalScore >= 80) return 'HOT';
  if (totalScore >= 60) return 'WARM';
  if (totalScore >= 40) return 'NURTURE';
  return 'LOW_FIT';
}

/**
 * Calculate lead score from qualification data.
 */
export function calculateLeadScore(data: {
  intent: Intent;
  locationFit: string;
  budgetNumeric: number | null;
  timelineFit: string;
}): LeadScore {
  let intent = 0;
  switch (data.intent) {
    case 'self_use': case 'investment': case 'both': intent = 25; break;
    case 'undecided': intent = 10; break;
    default: intent = 0;
  }

  let geography = 0;
  switch (data.locationFit) {
    case 'comfortable': geography = 25; break;
    case 'somewhat': geography = 15; break;
    case 'uncomfortable': geography = 5; break;
    default: geography = 0;
  }

  let budget = 0;
  if (data.budgetNumeric !== null) {
    if (data.budgetNumeric >= 9240000) budget = 30; // ≥ ₹92.4L
    else if (data.budgetNumeric >= 5000000) budget = 20; // Stretch
    else budget = 5; // Low
  }

  let timeline = 0;
  switch (data.timelineFit) {
    case 'comfortable': timeline = 20; break;
    case 'flexible': timeline = 12; break;
    case 'urgent': timeline = 5; break;
    default: timeline = 0;
  }

  const total = intent + geography + budget + timeline;

  return { intent, geography, budget, timeline, total };
}
