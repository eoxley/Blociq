/**
 * Outlook Add-in Intent Detection
 * 
 * Determines whether user input is a Q&A request or a reply drafting request
 * based on explicit triggers and Outlook message context.
 */

export interface OutlookMessageContext {
  from?: string;
  subject?: string;
  receivedDateTime?: string;
  bodyPreview?: string;
  hasSelection: boolean;
}

export interface IntentResult {
  intent: 'qa' | 'reply';
  confidence: number;
  triggers: string[];
  context?: OutlookMessageContext;
}

/**
 * Reply intent triggers - any of these keywords indicate reply drafting
 */
const REPLY_TRIGGERS = [
  'draft', 'reply', 'respond', 'write', 'compose', 'send',
  'email', 'message', 'response', 'answer back'
];

/**
 * Create regex pattern for reply triggers
 */
const REPLY_TRIGGER_REGEX = new RegExp(
  `\\b(${REPLY_TRIGGERS.join('|')})\\b`,
  'gi'
);

/**
 * Parse user intent from input text and Outlook context
 */
export function parseAddinIntent(
  userInput: string,
  outlookContext?: OutlookMessageContext
): IntentResult {
  const input = userInput.trim().toLowerCase();
  
  // Check for explicit reply triggers
  const replyMatches = input.match(REPLY_TRIGGER_REGEX);
  const hasReplyTriggers = replyMatches && replyMatches.length > 0;
  
  // Check for Outlook message selection context
  const hasOutlookSelection = outlookContext?.hasSelection || false;
  const hasOutlookHeaders = !!(
    outlookContext?.from || 
    outlookContext?.subject || 
    outlookContext?.receivedDateTime
  );
  
  // Determine intent based on triggers and context
  let intent: 'qa' | 'reply';
  let confidence: number;
  let triggers: string[] = [];
  
  if (hasReplyTriggers) {
    intent = 'reply';
    confidence = 0.9;
    triggers = replyMatches || [];
  } else if (hasOutlookSelection && hasOutlookHeaders) {
    intent = 'reply';
    confidence = 0.8;
    triggers = ['outlook_selection'];
  } else if (hasOutlookSelection) {
    intent = 'reply';
    confidence = 0.6;
    triggers = ['outlook_context'];
  } else {
    intent = 'qa';
    confidence = 0.9;
    triggers = ['default_qa'];
  }
  
  return {
    intent,
    confidence,
    triggers,
    context: outlookContext
  };
}

/**
 * Check if input contains property management domain keywords
 */
export function isPropertyManagementDomain(input: string): boolean {
  const domainKeywords = [
    'lease', 'leaseholder', 'freeholder', 'service charge', 'ground rent',
    'building', 'flat', 'unit', 'apartment', 'property', 'management',
    'compliance', 'safety', 'fire', 'electrical', 'gas', 'insurance',
    'section 20', 's20', 'consultation', 'major works', 'repairs',
    'maintenance', 'asbestos', 'fire risk', 'electrical safety',
    'right to manage', 'rtm', 'rmc', 'residents association',
    'forfeiture', 'relief', 'tribunal', 'dispute', 'complaint'
  ];
  
  const inputLower = input.toLowerCase();
  return domainKeywords.some(keyword => inputLower.includes(keyword));
}

/**
 * Check if input is out of scope for property management
 */
export function isOutOfScope(input: string): boolean {
  const outOfScopeKeywords = [
    'github', 'aws', 'api', 'json', 'xml', 'html', 'css', 'javascript',
    'typescript', 'node', 'react', 'next', 'vercel', 'docker',
    'kubernetes', 'terraform', 'secrets', 'keys', 'tokens', 'auth',
    'oauth', 'jwt', 'ssl', 'tls', 'database', 'sql', 'postgres',
    'mysql', 'mongodb', 'redis', 'server', 'cloud', 'devops',
    'ci', 'cd', 'pipeline', 'deployment', 'infrastructure'
  ];
  
  const inputLower = input.toLowerCase();
  return outOfScopeKeywords.some(keyword => inputLower.includes(keyword));
}

/**
 * Extract building/unit context from input or Outlook context
 */
export function extractBuildingContext(
  input: string,
  outlookContext?: OutlookMessageContext
): {
  buildingName?: string;
  unitNumber?: string;
  source: 'input' | 'outlook' | 'none';
} {
  // Try to extract from input first
  const buildingRegex = /(?:building|property|block)\s+(?:called\s+)?([A-Za-z\s]+?)(?:\s|$|,|\.)/i;
  const unitRegex = /(?:flat|unit|apartment)\s+(\d+[a-z]?)/i;
  
  const buildingMatch = input.match(buildingRegex);
  const unitMatch = input.match(unitRegex);
  
  if (buildingMatch || unitMatch) {
    return {
      buildingName: buildingMatch?.[1]?.trim(),
      unitNumber: unitMatch?.[1]?.trim(),
      source: 'input'
    };
  }
  
  // Try to extract from Outlook context
  if (outlookContext?.subject) {
    const subjectBuildingMatch = outlookContext.subject.match(buildingRegex);
    const subjectUnitMatch = outlookContext.subject.match(unitRegex);
    
    if (subjectBuildingMatch || subjectUnitMatch) {
      return {
        buildingName: subjectBuildingMatch?.[1]?.trim(),
        unitNumber: subjectUnitMatch?.[1]?.trim(),
        source: 'outlook'
      };
    }
  }
  
  return {
    source: 'none'
  };
}

/**
 * Validate intent result and provide feedback
 */
export function validateIntent(intentResult: IntentResult): {
  isValid: boolean;
  suggestions?: string[];
  warnings?: string[];
} {
  const { intent, confidence, context } = intentResult;
  
  const suggestions: string[] = [];
  const warnings: string[] = [];
  
  if (intent === 'reply' && confidence < 0.7) {
    warnings.push('Low confidence reply intent detected');
    suggestions.push('Consider being more explicit: "Draft a reply about..."');
  }
  
  if (intent === 'reply' && !context?.hasSelection) {
    suggestions.push('Select an email message for better context');
  }
  
  if (intent === 'qa' && context?.hasSelection) {
    suggestions.push('If you want to draft a reply, say "Draft a reply" or "Respond to this"');
  }
  
  return {
    isValid: confidence >= 0.5,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}
