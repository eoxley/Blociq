/**
 * Email Intent Parsing System
 * Analyzes email content to determine intent, category, urgency, and context
 */

import { EmailCategory, EmailContent, EmailContext, EmailAnalysis, type EmailAIAction } from './types';

export interface EmailIntent {
  action: EmailAIAction;
  category: EmailCategory;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  
  // Extracted identifiers
  buildingIdentifiers: string[];
  unitIdentifiers: string[];
  personNames: string[];
  
  // Analysis results
  sentiment: 'positive' | 'neutral' | 'negative';
  tone: string;
  
  // Flags
  flags: {
    isComplaint: boolean;
    isUrgent: boolean;
    hasMaintenanceRequest: boolean;
    requiresImmediateAction: boolean;
    mentionsLegalIssues: boolean;
    containsFinancialInformation: boolean;
    isFollowUp: boolean;
  };
  
  // Extracted information
  extractedInfo: {
    issues: string[];
    requestedActions: string[];
    dates: string[];
    amounts: string[];
    locations: string[];
  };
}

// ========================================
// Category Detection Patterns
// ========================================

const CATEGORY_PATTERNS = {
  maintenance_request: {
    keywords: [
      'repair', 'broken', 'fix', 'maintenance', 'leak', 'heating', 'plumbing',
      'electrical', 'window', 'door', 'lift', 'elevator', 'roof', 'gutter',
      'boiler', 'radiator', 'not working', 'faulty', 'damaged', 'urgent repair',
      'emergency repair', 'water damage', 'gas leak', 'no hot water'
    ],
    phrases: [
      /needs? repairing?/i,
      /not working properly/i,
      /urgent(?:ly)? need/i,
      /emergency repair/i,
      /water (?:leak|damage)/i,
      /heating (?:not working|broken|issue)/i
    ],
    confidence: 0.9
  },
  
  service_charge_query: {
    keywords: [
      'service charge', 'ground rent', 'management fee', 'invoice', 'bill',
      'payment', 'account', 'overdue', 'balance', 'quarterly', 'annual',
      'section 20', 'major works', 'contribution', 'levy', 'arrears'
    ],
    phrases: [
      /service charge(?:s?)/i,
      /ground rent/i,
      /management fee/i,
      /section 20/i,
      /payment (?:due|overdue)/i,
      /(?:quarterly|annual) (?:charge|fee)/i
    ],
    confidence: 0.85
  },
  
  noise_complaint: {
    keywords: [
      'noise', 'loud', 'disturbing', 'banging', 'music', 'party', 'shouting',
      'dog barking', 'children', 'footsteps', 'drilling', 'late night',
      'early morning', 'unreasonable hours', 'antisocial'
    ],
    phrases: [
      /noise (?:complaint|issue|problem)/i,
      /too loud/i,
      /disturbing (?:the )?peace/i,
      /antisocial (?:behaviour|behavior)/i,
      /unreasonable hours/i
    ],
    confidence: 0.9
  },
  
  access_request: {
    keywords: [
      'access', 'key', 'fob', 'entry', 'gate', 'door code', 'buzzer',
      'intercom', 'parking', 'visitor', 'contractor', 'delivery',
      'locked out', 'emergency access'
    ],
    phrases: [
      /(?:need|request) access/i,
      /door code/i,
      /parking (?:space|permit)/i,
      /locked out/i,
      /visitor access/i,
      /contractor access/i
    ],
    confidence: 0.85
  },
  
  lease_query: {
    keywords: [
      'lease', 'tenancy', 'agreement', 'contract', 'terms', 'renewal',
      'extension', 'assignment', 'subletting', 'permitted use',
      'alterations', 'pets', 'insurance', 'deposit'
    ],
    phrases: [
      /lease (?:agreement|terms|renewal)/i,
      /tenancy agreement/i,
      /lease extension/i,
      /permitted (?:use|alterations)/i,
      /pet policy/i
    ],
    confidence: 0.8
  },
  
  compliance: {
    keywords: [
      'fire safety', 'health and safety', 'building safety', 'regulation',
      'certificate', 'inspection', 'compliance', 'epc', 'gas safety',
      'electrical certificate', 'lift certificate', 'building regulations'
    ],
    phrases: [
      /(?:fire|health|building) safety/i,
      /(?:gas|electrical) certificate/i,
      /building regulations/i,
      /safety inspection/i,
      /compliance (?:certificate|check)/i
    ],
    confidence: 0.85
  }
};

// ========================================
// Urgency Detection Patterns
// ========================================

const URGENCY_PATTERNS = {
  urgent: {
    keywords: [
      'urgent', 'emergency', 'asap', 'immediately', 'critical', 'dangerous',
      'gas leak', 'fire', 'flood', 'no heating', 'no hot water', 'security breach'
    ],
    phrases: [
      /urgent(?:ly)?/i,
      /as soon as possible/i,
      /immediate(?:ly)? (?:attention|action)/i,
      /emergency repair/i,
      /health and safety/i
    ],
    score: 4
  },
  
  high: {
    keywords: [
      'soon', 'quickly', 'prompt', 'priority', 'important', 'serious',
      'significant', 'major', 'considerable', 'substantial'
    ],
    phrases: [
      /need(?:s)? (?:prompt|quick) (?:attention|action)/i,
      /high priority/i,
      /serious (?:issue|problem|concern)/i,
      /major (?:issue|problem)/i
    ],
    score: 3
  },
  
  medium: {
    keywords: [
      'convenient', 'reasonable', 'appropriate', 'suitable', 'when possible'
    ],
    phrases: [
      /when (?:convenient|possible)/i,
      /at your (?:convenience|earliest convenience)/i,
      /reasonable (?:time|timeframe)/i
    ],
    score: 2
  },
  
  low: {
    keywords: [
      'eventually', 'sometime', 'no rush', 'when you can', 'routine'
    ],
    phrases: [
      /no (?:rush|hurry)/i,
      /when you (?:can|have time)/i,
      /routine (?:maintenance|inspection)/i,
      /at some point/i
    ],
    score: 1
  }
};

// ========================================
// Sentiment Analysis Patterns
// ========================================

const SENTIMENT_PATTERNS = {
  positive: {
    keywords: [
      'thank', 'appreciate', 'excellent', 'great', 'wonderful', 'pleased',
      'satisfied', 'happy', 'good', 'helpful', 'professional', 'efficient'
    ],
    phrases: [
      /thank you/i,
      /much appreciated/i,
      /excellent (?:service|work)/i,
      /very (?:pleased|satisfied|happy)/i
    ],
    score: 1
  },
  
  negative: {
    keywords: [
      'complaint', 'disappointed', 'frustrated', 'angry', 'unacceptable',
      'disgraceful', 'appalling', 'terrible', 'awful', 'shocking', 'outraged',
      'fed up', 'sick of', 'had enough'
    ],
    phrases: [
      /(?:formal )?complaint/i,
      /(?:very|extremely) (?:disappointed|frustrated|angry)/i,
      /unacceptable (?:service|situation)/i,
      /had enough/i,
      /sick (?:and tired )?of/i
    ],
    score: -1
  }
};

// ========================================
// Main Intent Parsing Function
// ========================================

export function parseEmailIntent(emailContent: EmailContent, context?: EmailContext): EmailIntent {
  const text = `${emailContent.subject || ''} ${emailContent.body || ''}`.toLowerCase();
  
  // Detect category
  const category = detectCategory(text);
  
  // Detect urgency
  const urgency = detectUrgency(text);
  
  // Detect sentiment
  const sentiment = detectSentiment(text);
  
  // Extract identifiers
  const buildingIdentifiers = extractBuildingIdentifiers(text);
  const unitIdentifiers = extractUnitIdentifiers(text);
  const personNames = extractPersonNames(text);
  
  // Detect flags
  const flags = detectFlags(text);
  
  // Extract specific information
  const extractedInfo = extractKeyInformation(text);
  
  // Determine primary action based on analysis
  const action = determineAction(category, urgency, flags, context);
  
  // Calculate confidence score
  const confidence = calculateConfidence(category, urgency, flags, extractedInfo);
  
  return {
    action,
    category,
    urgency,
    confidence,
    buildingIdentifiers,
    unitIdentifiers,
    personNames,
    sentiment,
    tone: determineTone(text, sentiment),
    flags,
    extractedInfo
  };
}

// ========================================
// Category Detection
// ========================================

function detectCategory(text: string): EmailCategory {
  let bestMatch: { category: EmailCategory; score: number } = {
    category: 'general_inquiry',
    score: 0
  };
  
  for (const [categoryName, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    let score = 0;
    
    // Check keywords
    for (const keyword of patterns.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    // Check phrases (regex patterns)
    for (const phrase of patterns.phrases) {
      if (phrase.test(text)) {
        score += 2; // Phrases have higher weight
      }
    }
    
    // Apply confidence multiplier
    const finalScore = score * patterns.confidence;
    
    if (finalScore > bestMatch.score) {
      bestMatch = {
        category: categoryName as EmailCategory,
        score: finalScore
      };
    }
  }
  
  return bestMatch.category;
}

// ========================================
// Urgency Detection
// ========================================

function detectUrgency(text: string): 'low' | 'medium' | 'high' | 'urgent' {
  let maxScore = 0;
  let detectedUrgency: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  
  for (const [urgencyLevel, patterns] of Object.entries(URGENCY_PATTERNS)) {
    let score = 0;
    
    // Check keywords
    for (const keyword of patterns.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += patterns.score;
      }
    }
    
    // Check phrases
    for (const phrase of patterns.phrases) {
      if (phrase.test(text)) {
        score += patterns.score * 1.5; // Phrases have higher weight
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      detectedUrgency = urgencyLevel as 'low' | 'medium' | 'high' | 'urgent';
    }
  }
  
  return detectedUrgency;
}

// ========================================
// Sentiment Detection
// ========================================

function detectSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  let sentimentScore = 0;
  
  for (const [sentimentType, patterns] of Object.entries(SENTIMENT_PATTERNS)) {
    // Check keywords
    for (const keyword of patterns.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        sentimentScore += patterns.score;
      }
    }
    
    // Check phrases
    for (const phrase of patterns.phrases) {
      if (phrase.test(text)) {
        sentimentScore += patterns.score * 1.5;
      }
    }
  }
  
  if (sentimentScore > 0.5) return 'positive';
  if (sentimentScore < -0.5) return 'negative';
  return 'neutral';
}

// ========================================
// Identifier Extraction
// ========================================

function extractBuildingIdentifiers(text: string): string[] {
  const buildingPatterns = [
    /([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(?:house|court|place|tower|manor|lodge|building|block)/gi,
    /building\s+([A-Za-z0-9\s]+?)(?:\s|$|,|\?)/gi,
    /(\d+\s+\w+(?:\s+\w+)*?)(?:\s+(?:house|court|place|tower|manor|lodge))/gi
  ];
  
  const identifiers = new Set<string>();
  
  for (const pattern of buildingPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 2) {
        identifiers.add(match[1].trim());
      }
    }
  }
  
  return Array.from(identifiers);
}

function extractUnitIdentifiers(text: string): string[] {
  const unitPatterns = [
    /(?:unit|flat|apartment|apt)\s*([0-9]+[a-zA-Z]?)/gi,
    /(?:^|\s|of\s+|in\s+)([0-9]+[a-zA-Z]?)(?:\s+(?:ashwood|oak|building|house|court|place)|$|\s)/gi,
    /number\s+([0-9]+[a-zA-Z]?)/gi
  ];
  
  const identifiers = new Set<string>();
  
  for (const pattern of unitPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim()) {
        identifiers.add(match[1].trim());
      }
    }
  }
  
  return Array.from(identifiers);
}

function extractPersonNames(text: string): string[] {
  // Basic name extraction - can be enhanced with NLP libraries
  const namePatterns = [
    /(?:mr|mrs|miss|ms|dr)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /(?:from|regards|sincerely|best)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi
  ];
  
  const names = new Set<string>();
  
  for (const pattern of namePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 2) {
        names.add(match[1].trim());
      }
    }
  }
  
  return Array.from(names);
}

// ========================================
// Flag Detection
// ========================================

function detectFlags(text: string) {
  return {
    isComplaint: /complaint|complain|disappointed|unacceptable|disgraceful/i.test(text),
    isUrgent: /urgent|emergency|asap|immediately|critical/i.test(text),
    hasMaintenanceRequest: /repair|fix|broken|maintenance|not working/i.test(text),
    requiresImmediateAction: /immediate|urgent|emergency|asap|critical|dangerous/i.test(text),
    mentionsLegalIssues: /legal|solicitor|lawyer|court|breach|liability/i.test(text),
    containsFinancialInformation: /£|\$|payment|invoice|charge|fee|cost|amount/i.test(text),
    isFollowUp: /follow.?up|following up|further to|reference/i.test(text)
  };
}

// ========================================
// Key Information Extraction
// ========================================

function extractKeyInformation(text: string) {
  return {
    issues: extractIssues(text),
    requestedActions: extractRequestedActions(text),
    dates: extractDates(text),
    amounts: extractAmounts(text),
    locations: extractLocations(text)
  };
}

function extractIssues(text: string): string[] {
  const issuePatterns = [
    /(?:issue|problem|trouble|fault)(?:\s+with)?[:\s]+([^.!?\n]+)/gi,
    /([^.!?\n]+)\s+(?:is|are)\s+(?:broken|not working|faulty|damaged)/gi,
    /([^.!?\n]+)\s+(?:needs?|requires?)\s+(?:repair|fixing|attention)/gi
  ];
  
  const issues = new Set<string>();
  
  for (const pattern of issuePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 5) {
        issues.add(match[1].trim());
      }
    }
  }
  
  return Array.from(issues);
}

function extractRequestedActions(text: string): string[] {
  const actionPatterns = [
    /(?:please|could you|can you|would you)\s+([^.!?\n]+)/gi,
    /(?:need|require|request)\s+(?:you to\s+)?([^.!?\n]+)/gi,
    /(?:should|must|need to)\s+([^.!?\n]+)/gi
  ];
  
  const actions = new Set<string>();
  
  for (const pattern of actionPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 5) {
        actions.add(match[1].trim());
      }
    }
  }
  
  return Array.from(actions);
}

function extractDates(text: string): string[] {
  const datePatterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
    /\b(\d{1,2}-\d{1,2}-\d{2,4})\b/g,
    /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{2,4})\b/gi,
    /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{2,4})\b/gi
  ];
  
  const dates = new Set<string>();
  
  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        dates.add(match[1].trim());
      }
    }
  }
  
  return Array.from(dates);
}

function extractAmounts(text: string): string[] {
  const amountPatterns = [
    /£\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:pounds?|gbp)/gi
  ];
  
  const amounts = new Set<string>();
  
  for (const pattern of amountPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[0]) {
        amounts.add(match[0].trim());
      }
    }
  }
  
  return Array.from(amounts);
}

function extractLocations(text: string): string[] {
  const locationPatterns = [
    /(?:in|at|on)\s+(?:the\s+)?([^.!?\n,]+?)(?:\s+(?:area|room|space|corridor|lobby|entrance))/gi,
    /(kitchen|bathroom|bedroom|living room|hallway|corridor|stairwell|lobby|entrance|car park|garage|garden)/gi
  ];
  
  const locations = new Set<string>();
  
  for (const pattern of locationPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 2) {
        locations.add(match[1].trim());
      }
    }
  }
  
  return Array.from(locations);
}

// ========================================
// Utility Functions
// ========================================

function determineAction(
  category: EmailCategory, 
  urgency: string, 
  flags: any, 
  context?: EmailContext
): EmailAIAction {
  // If it's clearly a complaint or urgent issue, prioritize analysis
  if (flags.isComplaint || urgency === 'urgent') {
    return 'analyze';
  }
  
  // If it's a maintenance request, suggest immediate reply
  if (category === 'maintenance_request' || flags.hasMaintenanceRequest) {
    return 'suggest_reply';
  }
  
  // If it's a query that needs information, analyze first
  if (category === 'service_charge_query' || category === 'lease_query') {
    return 'analyze';
  }
  
  // Default to analyze for unknown intents
  return 'analyze';
}

function determineTone(text: string, sentiment: string): string {
  if (sentiment === 'negative') {
    if (/urgent|emergency/i.test(text)) return 'urgent-concerned';
    if (/angry|outraged|unacceptable/i.test(text)) return 'angry';
    return 'disappointed';
  }
  
  if (sentiment === 'positive') {
    if (/thank|appreciate/i.test(text)) return 'grateful';
    return 'satisfied';
  }
  
  if (/formal|official/i.test(text)) return 'formal';
  if (/please|could you|would you/i.test(text)) return 'polite-request';
  
  return 'neutral-inquiry';
}

function calculateConfidence(
  category: EmailCategory, 
  urgency: string, 
  flags: any, 
  extractedInfo: any
): number {
  let confidence = 0.5; // Base confidence
  
  // Category-specific confidence boosts
  if (category !== 'general_inquiry') confidence += 0.2;
  
  // Urgency detection confidence
  if (urgency === 'urgent' && flags.isUrgent) confidence += 0.2;
  if (urgency === 'low' && !flags.requiresImmediateAction) confidence += 0.1;
  
  // Information extraction confidence
  if (extractedInfo.issues.length > 0) confidence += 0.1;
  if (extractedInfo.requestedActions.length > 0) confidence += 0.1;
  if (extractedInfo.dates.length > 0) confidence += 0.05;
  if (extractedInfo.amounts.length > 0) confidence += 0.05;
  
  return Math.min(confidence, 1.0);
}