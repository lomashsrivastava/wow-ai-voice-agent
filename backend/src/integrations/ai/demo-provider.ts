/**
 * Demo AI Provider — No external dependencies
 * Returns predefined responses for demonstration purposes.
 */
import { BaseAIProvider } from './base-provider.js';
import type { AIProvider, AIGenerateRequest, AIGenerateResponse, ProviderName } from './types.js';
import { logger } from '../../utils/logger.js';

const DEMO_RESPONSES: Record<string, string> = {
  greeting: `Hello! This is Priya calling on behalf of Divyasree Developers regarding our premium project "Whispers of the Wind" near Nandi Hills. Is this a good time for a quick two-minute conversation?`,
  
  permission_yes: `Wonderful! Thank you for your time. I'd love to share some exciting details about this exclusive development. Are you currently exploring property options for personal use, or is this more of an investment consideration?`,
  
  permission_no: `I completely understand. Would it be convenient if I called back at a different time? I'd love to share some details about this premium project near Nandi Hills.`,
  
  intent_investment: `That's a great perspective. Whispers of the Wind is positioned in the rapidly developing Nandi Valley corridor, near Kempegowda International Airport. The Private Valley concept with 74% open spaces makes it a unique proposition. Are you familiar with the Nandi Hills area?`,
  
  intent_selfuse: `That's wonderful! Imagine waking up to scenic hill views with eco-parks right outside your door. Our Private Valley features a 20,000 sq.ft. clubhouse and dedicated nature trails. Are you familiar with the Nandi Hills area of North Bengaluru?`,
  
  geography_yes: `Perfect. The Nandi Valley location offers an ideal balance — close enough for weekend getaways, yet tucked away in nature. Our plots start from ₹92.4 lakh. Does this range align with what you're considering?`,
  
  budget_fit: `That's great to hear. The project offers plots from 1,200 to 3,199 sq.ft., with possession expected by December 2029. The development is currently in progress. Does that timeline work for you?`,
  
  qualified: `Wonderful! Based on our conversation, I think this could be an excellent fit. I'd like to arrange a call with our Property Expert who can share the latest availability and specific plot options. Would you prefer a call in the morning or afternoon?`,
  
  fallback: `I appreciate your interest! To give you the most accurate and detailed information, I'd recommend speaking with our Property Expert. They can share specific details about availability, pricing for different plot sizes, and arrange a site visit if you'd like. Shall I set that up for you?`,
};

export class DemoProvider extends BaseAIProvider implements AIProvider {
  public readonly name: ProviderName = 'demo';

  constructor() {
    super(0);
    this.initHealth();
    this.health.status = 'available';
    logger.info({ provider: 'demo' }, 'Demo provider initialized (always available)');
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const start = Date.now();

    // Find the last user message
    const lastUserMessage = [...request.messages]
      .reverse()
      .find(m => m.role === 'user')?.content?.toLowerCase() || '';

    let responseKey = 'fallback';
    
    if (lastUserMessage.includes('hello') || lastUserMessage.includes('hi') || request.messages.filter(m => m.role === 'user').length === 0) {
      responseKey = 'greeting';
    } else if (lastUserMessage.includes('yes') && request.messages.length <= 4) {
      responseKey = 'permission_yes';
    } else if (lastUserMessage.includes('no') || lastUserMessage.includes('busy') || lastUserMessage.includes('not a good time')) {
      responseKey = 'permission_no';
    } else if (lastUserMessage.includes('invest')) {
      responseKey = 'intent_investment';
    } else if (lastUserMessage.includes('self') || lastUserMessage.includes('live') || lastUserMessage.includes('home') || lastUserMessage.includes('weekend')) {
      responseKey = 'intent_selfuse';
    } else if (lastUserMessage.includes('nandi') || lastUserMessage.includes('know the area') || lastUserMessage.includes('familiar')) {
      responseKey = 'geography_yes';
    } else if (lastUserMessage.includes('budget') || lastUserMessage.includes('lakh') || lastUserMessage.includes('crore') || lastUserMessage.includes('afford')) {
      responseKey = 'budget_fit';
    } else if (lastUserMessage.includes('timeline') || lastUserMessage.includes('2029') || lastUserMessage.includes('ok') || lastUserMessage.includes('fine')) {
      responseKey = 'qualified';
    }

    const content = DEMO_RESPONSES[responseKey] || DEMO_RESPONSES.fallback;
    
    // Simulate slight latency for realism
    await new Promise(resolve => setTimeout(resolve, 100));
    const latencyMs = Date.now() - start;

    this.recordSuccess();

    return {
      content: `[DEMO MODE] ${content}`,
      provider: 'demo',
      model: 'demo-v1',
      latencyMs,
    };
  }

  isAvailable(): boolean {
    return true; // Demo is always available
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
