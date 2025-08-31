import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface EmailContent {
  subject: string;
  body: string;
  from_email: string;
  body_preview: string;
  importance?: string;
  received_at: string;
}

interface UrgencyAnalysis {
  level: 'critical' | 'high' | 'medium' | 'low';
  score: number;
  factors: string[];
  reasoning: string;
}

interface PropertyMention {
  name: string;
  confidence: number;
  context: string;
}

interface AIInsight {
  type: 'follow_up' | 'recurring' | 'compliance' | 'emergency' | 'maintenance' | 'financial';
  message: string;
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export function detectUrgency(email: EmailContent): UrgencyAnalysis {
  const text = `${email.subject} ${email.body || email.body_preview}`.toLowerCase();
  let score = 0;
  const factors: string[] = [];
  
  // Base importance level scoring
  if (email.importance === 'high') {
    score += 5;
    factors.push('High importance flag');
  }
  
  // Critical urgency keywords (8-10 points each)
  const criticalKeywords = [
    'emergency', 'urgent', 'asap', 'immediate', 'critical', 'crisis',
    'flooding', 'fire', 'gas leak', 'electrical fault', 'dangerous',
    'evacuate', 'ambulance', 'police', 'injury', 'accident'
  ];
  
  criticalKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 9;
      factors.push(`Critical keyword: "${keyword}"`);
    }
  });
  
  // High urgency keywords (4-6 points each)
  const highKeywords = [
    'broken', 'fault', 'not working', 'repair', 'fix', 'heating',
    'hot water', 'boiler', 'leak', 'noise', 'complaint', 'legal',
    'solicitor', 'court', 'eviction', 'breach', 'violation'
  ];
  
  highKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 5;
      factors.push(`High urgency keyword: "${keyword}"`);
    }
  });
  
  // Medium urgency keywords (2-3 points each)
  const mediumKeywords = [
    'maintenance', 'service charge', 'payment', 'overdue', 'arrears',
    'inspection', 'access', 'appointment', 'meeting', 'query'
  ];
  
  mediumKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 2;
      factors.push(`Medium urgency keyword: "${keyword}"`);
    }
  });
  
  // Time-based urgency indicators
  const timeUrgent = [
    'today', 'now', 'immediately', 'this morning', 'this afternoon',
    'before 5pm', 'end of day', 'eod', 'by tomorrow'
  ];
  
  timeUrgent.forEach(phrase => {
    if (text.includes(phrase)) {
      score += 4;
      factors.push(`Time urgency: "${phrase}"`);
    }
  });
  
  // Email age factor (older unread emails get higher priority)
  const emailAge = Date.now() - new Date(email.received_at).getTime();
  const hoursOld = emailAge / (1000 * 60 * 60);
  
  if (hoursOld > 48) {
    score += 3;
    factors.push(`Email is ${Math.round(hoursOld)} hours old`);
  } else if (hoursOld > 24) {
    score += 2;
    factors.push(`Email is ${Math.round(hoursOld)} hours old`);
  }
  
  // Multiple exclamation marks or caps
  const exclamationCount = (text.match(/!/g) || []).length;
  const capsWords = text.match(/\b[A-Z]{3,}\b/g) || [];
  
  if (exclamationCount > 2) {
    score += 2;
    factors.push(`Multiple exclamation marks (${exclamationCount})`);
  }
  
  if (capsWords.length > 2) {
    score += 2;
    factors.push(`Multiple caps words (${capsWords.length})`);
  }
  
  // Determine final urgency level
  let level: UrgencyAnalysis['level'] = 'low';
  let reasoning = '';
  
  if (score >= 15) {
    level = 'critical';
    reasoning = 'Critical urgency detected - immediate attention required';
  } else if (score >= 8) {
    level = 'high';
    reasoning = 'High urgency - should be addressed today';
  } else if (score >= 4) {
    level = 'medium';
    reasoning = 'Medium urgency - address within 24-48 hours';
  } else {
    level = 'low';
    reasoning = 'Low urgency - standard response time';
  }
  
  return {
    level,
    score: Math.min(score, 20), // Cap at 20
    factors,
    reasoning
  };
}

export function extractProperties(email: EmailContent): PropertyMention[] {
  const text = `${email.subject} ${email.body || email.body_preview}`;
  const properties: PropertyMention[] = [];
  
  // Common property name patterns
  const patterns = [
    // Standard property names
    /\b([A-Z][a-z]+\s+(House|Manor|Gardens|Lodge|Court|Building|Apartments?|Flats?|Estate|Tower|Place|Square|Mews|Close|Road|Street|Avenue|Lane|Drive|Way))\b/gi,
    // Property with numbers
    /\b(\d+\s+[A-Z][a-z]+\s+(House|Manor|Gardens|Lodge|Court|Road|Street|Avenue|Lane|Drive|Way))\b/gi,
    // Block/Building references
    /\b(Block\s+[A-Z]|Building\s+\d+|Tower\s+[A-Z])\b/gi,
    // Estate references
    /\b([A-Z][a-z]+\s+Estate)\b/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = Array.from(text.matchAll(pattern));
    matches.forEach(match => {
      const propertyName = match[1].trim();
      const context = text.substring(Math.max(0, match.index! - 20), match.index! + match[0].length + 20);
      
      // Calculate confidence based on context
      let confidence = 0.7;
      
      // Higher confidence if in subject line
      if (email.subject.includes(propertyName)) {
        confidence += 0.2;
      }
      
      // Higher confidence if mentioned with property-specific terms
      const propertyTerms = ['unit', 'flat', 'apartment', 'lease', 'tenant', 'resident'];
      if (propertyTerms.some(term => context.toLowerCase().includes(term))) {
        confidence += 0.1;
      }
      
      properties.push({
        name: propertyName,
        confidence: Math.min(confidence, 1.0),
        context: context.trim()
      });
    });
  });
  
  // Remove duplicates and sort by confidence
  const uniqueProperties = properties
    .filter((prop, index, self) => 
      self.findIndex(p => p.name.toLowerCase() === prop.name.toLowerCase()) === index
    )
    .sort((a, b) => b.confidence - a.confidence);
  
  return uniqueProperties.slice(0, 5); // Return top 5 matches
}

export async function generateAIInsights(email: EmailContent, urgency: UrgencyAnalysis, properties: PropertyMention[]): Promise<AIInsight[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [];
  }
  
  try {
    const prompt = `Analyze this property management email and provide actionable insights:

Subject: ${email.subject}
From: ${email.from_email}
Content: ${email.body_preview || email.body?.substring(0, 500)}
Urgency Level: ${urgency.level} (Score: ${urgency.score})
Properties Mentioned: ${properties.map(p => p.name).join(', ')}

Provide up to 3 specific, actionable insights in this exact JSON format:
[
  {
    "type": "follow_up|recurring|compliance|emergency|maintenance|financial",
    "message": "Specific insight about what needs attention",
    "action": "Specific action to take",
    "priority": "critical|high|medium|low"
  }
]

Focus on:
1. What immediate actions are needed
2. Any compliance or legal implications  
3. Recurring issues that need systematic attention
4. Emergency situations requiring immediate response
5. Financial impacts or payment issues

Return only the JSON array.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) return [];
    
    const insights = JSON.parse(content);
    return Array.isArray(insights) ? insights.slice(0, 3) : [];
    
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return [];
  }
}

export function generateSuggestedActions(email: EmailContent, urgency: UrgencyAnalysis, properties: PropertyMention[]): string[] {
  const actions: string[] = [];
  
  // Urgency-based actions
  if (urgency.level === 'critical') {
    actions.push('Contact emergency services if safety issue');
    actions.push('Notify property manager immediately');
    actions.push('Document incident details');
  } else if (urgency.level === 'high') {
    actions.push('Schedule urgent repair/inspection');
    actions.push('Contact tenant within 2 hours');
    actions.push('Review maintenance contract');
  } else if (urgency.level === 'medium') {
    actions.push('Add to maintenance schedule');
    actions.push('Respond within 24 hours');
    actions.push('Check service provider availability');
  } else {
    actions.push('Add to weekly review list');
    actions.push('Standard acknowledgment reply');
    actions.push('File for reference');
  }
  
  // Content-based actions
  const text = `${email.subject} ${email.body || email.body_preview}`.toLowerCase();
  
  if (text.includes('payment') || text.includes('service charge')) {
    actions.push('Check payment status');
    actions.push('Review account balance');
    actions.push('Send payment reminder if needed');
  }
  
  if (text.includes('repair') || text.includes('maintenance')) {
    actions.push('Schedule maintenance inspection');
    actions.push('Contact approved contractor');
    actions.push('Inform tenant of repair timeline');
  }
  
  if (text.includes('complaint')) {
    actions.push('Log formal complaint');
    actions.push('Investigate issue thoroughly');
    actions.push('Provide formal response within SLA');
  }
  
  if (text.includes('legal') || text.includes('solicitor')) {
    actions.push('Forward to legal team');
    actions.push('Review lease terms');
    actions.push('Seek legal advice if needed');
  }
  
  // Property-specific actions
  if (properties.length > 0) {
    actions.push(`Review ${properties[0].name} maintenance history`);
    actions.push(`Check ${properties[0].name} compliance status`);
  }
  
  // Remove duplicates and return top 5
  return [...new Set(actions)].slice(0, 5);
}

export function categorizeEmail(email: EmailContent, urgency: UrgencyAnalysis): string {
  const text = `${email.subject} ${email.body || email.body_preview}`.toLowerCase();
  
  // Emergency/Critical
  if (urgency.level === 'critical') {
    return 'emergency';
  }
  
  // Maintenance
  if (text.includes('repair') || text.includes('maintenance') || text.includes('broken') || 
      text.includes('heating') || text.includes('boiler') || text.includes('leak')) {
    return 'maintenance';
  }
  
  // Complaints
  if (text.includes('complaint') || text.includes('complain') || text.includes('unhappy') ||
      text.includes('dissatisfied') || text.includes('problem') || text.includes('issue')) {
    return 'complaint';
  }
  
  // Financial/Payments
  if (text.includes('payment') || text.includes('service charge') || text.includes('rent') ||
      text.includes('invoice') || text.includes('arrears') || text.includes('overdue')) {
    return 'payment';
  }
  
  // Legal/Compliance
  if (text.includes('legal') || text.includes('solicitor') || text.includes('court') ||
      text.includes('lease') || text.includes('tenancy') || text.includes('eviction')) {
    return 'legal';
  }
  
  // Tenant queries
  if (text.includes('query') || text.includes('question') || text.includes('enquiry') ||
      text.includes('information') || text.includes('clarification')) {
    return 'tenant_query';
  }
  
  // Access requests
  if (text.includes('access') || text.includes('visit') || text.includes('inspection') ||
      text.includes('appointment') || text.includes('entry')) {
    return 'access_request';
  }
  
  // Default
  return 'general';
}