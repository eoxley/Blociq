/**
 * Outlook Add-in Prompt Builder
 * 
 * Creates domain-locked system prompts and reply templates for the Outlook Add-in
 * with strict property management focus and British English requirements.
 */

import { PROPERTY_ACRONYMS, expandAcronymsInText, isOutOfScope } from '../glossary/propertyAcronyms';
import { IntentResult } from '../intent/parseAddinIntent';

export interface AddinPromptContext {
  userInput: string;
  intent: IntentResult;
  buildingContext?: {
    buildingName?: string;
    unitNumber?: string;
    buildingId?: string;
  };
  leaseSummary?: any; // Lease Lab summary data
  outlookContext?: {
    from?: string;
    subject?: string;
    receivedDateTime?: string;
    bodyPreview?: string;
  };
  userSettings?: {
    signature?: string;
    tone?: 'formal' | 'friendly' | 'concise';
  };
}

/**
 * Hard domain lock system prompt - non-negotiable rules
 */
const DOMAIN_LOCK_PROMPT = `You are the BlocIQ Outlook Add-in Assistant, operating EXCLUSIVELY in UK leasehold block management.

DOMAIN RESTRICTIONS (NON-NEGOTIABLE):
- Scope: UK leasehold block management, building safety, compliance, insurance, RICS/TPI governance, Section 20, lease clauses
- Facts first: Use BlocIQ data (Supabase + Lease Lab summaries). If unavailable, say "Not specified in the lease/building records."
- Do not invent information
- Acronyms: Interpret using property domain meanings only
- Email drafting: Only when explicitly requested or with active Outlook selection
- Style: British English, professional, concise
- Safety: If you don't know, say you don't know

ACRONYM INTERPRETATION:
- RCA = Restatement Cost Analysis (insurance rebuild valuation)
- S20/Section 20 = LTA 1985 consultation thresholds
- FRA/FRAEW = Fire Risk Assessment/External Wall
- EICR = Electrical Installation Condition Report
- HRB = Higher-Risk Building (BSA)
- RTA = Recognised Tenants' Association
- S.146 = Forfeiture/relief pre-conditions
- RMC/RTM = Resident Management Company/Right to Manage
- EWS1 = External Wall System assessment form

OUT OF SCOPE REFUSAL:
If asked about IT, security, development, or non-property topics, respond: "Out of scope for BlocIQ add-in. I only handle UK leasehold and building-safety topics."

MISSING FACTS RESPONSE:
If information is not available in BlocIQ data, respond: "Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis."`;

/**
 * Q&A system prompt for property management queries
 */
export function buildQAQueryPrompt(context: AddinPromptContext): string {
  const { userInput, buildingContext, leaseSummary } = context;
  
  let prompt = DOMAIN_LOCK_PROMPT + '\n\n';
  
  // Add building context if available
  if (buildingContext?.buildingName) {
    prompt += `BUILDING CONTEXT: ${buildingContext.buildingName}`;
    if (buildingContext.unitNumber) {
      prompt += `, Unit ${buildingContext.unitNumber}`;
    }
    prompt += '\n';
  }
  
  // Add lease summary context if available
  if (leaseSummary) {
    prompt += `\nLEASE SUMMARY AVAILABLE:\n`;
    prompt += `- Document Type: ${leaseSummary.doc_type || 'lease'}\n`;
    prompt += `- Status: ${leaseSummary.status || 'READY'}\n`;
    prompt += `- Use this data to answer questions about lease terms, repair obligations, and building-specific information\n`;
    prompt += `- Always cite page references when available (e.g., "Lease Lab, p.5")\n`;
  }
  
  prompt += `\nUSER QUERY: ${userInput}\n\n`;
  prompt += `INSTRUCTIONS:\n`;
  prompt += `1. Answer the question using only BlocIQ data and lease summary information\n`;
  prompt += `2. If information is not available, state "Not specified in the lease/building records"\n`;
  prompt += `3. Use British English and property management terminology\n`;
  prompt += `4. Be concise and professional\n`;
  prompt += `5. Do not format as an email - this is a Q&A response\n`;
  prompt += `6. If lease summary data is used, include page references\n`;
  
  return prompt;
}

/**
 * Reply drafting system prompt
 */
export function buildReplyPrompt(context: AddinPromptContext): string {
  const { userInput, buildingContext, leaseSummary, outlookContext, userSettings } = context;
  
  let prompt = DOMAIN_LOCK_PROMPT + '\n\n';
  prompt += `REPLY DRAFTING MODE\n\n`;
  
  // Add Outlook context
  if (outlookContext) {
    prompt += `OUTLOOK MESSAGE CONTEXT:\n`;
    if (outlookContext.from) prompt += `From: ${outlookContext.from}\n`;
    if (outlookContext.subject) prompt += `Subject: ${outlookContext.subject}\n`;
    if (outlookContext.receivedDateTime) prompt += `Date: ${outlookContext.receivedDateTime}\n`;
    if (outlookContext.bodyPreview) {
      prompt += `Content Preview: ${outlookContext.bodyPreview.substring(0, 200)}...\n`;
    }
    prompt += '\n';
  }
  
  // Add building context
  if (buildingContext?.buildingName) {
    prompt += `BUILDING CONTEXT: ${buildingContext.buildingName}`;
    if (buildingContext.unitNumber) {
      prompt += `, Unit ${buildingContext.unitNumber}`;
    }
    prompt += '\n\n';
  }
  
  // Add lease summary context
  if (leaseSummary) {
    prompt += `LEASE SUMMARY AVAILABLE:\n`;
    prompt += `- Use this data to provide accurate, lease-specific information\n`;
    prompt += `- Reference specific clauses and page numbers when available\n`;
    prompt += `- Ensure all statements are backed by lease documentation\n\n`;
  }
  
  // Add user settings
  if (userSettings?.tone) {
    prompt += `TONE: ${userSettings.tone}\n`;
  }
  
  prompt += `USER REQUEST: ${userInput}\n\n`;
  prompt += `REPLY DRAFTING INSTRUCTIONS:\n`;
  prompt += `1. Draft a professional British-English reply\n`;
  prompt += `2. Use only provided facts and lease summary data\n`;
  prompt += `3. If a fact is missing, state that it's not specified\n`;
  prompt += `4. Reference lease clauses and page numbers when available\n`;
  prompt += `5. No legal advice - reference the lease for specific terms\n`;
  prompt += `6. Professional, courteous tone appropriate for property management\n`;
  prompt += `7. Include relevant building context if applicable\n`;
  
  if (userSettings?.signature) {
    prompt += `8. End with signature: ${userSettings.signature}\n`;
  }
  
  return prompt;
}

/**
 * Build reply context with deterministic facts
 */
export function buildReplyContext(context: AddinPromptContext): {
  replyFacts: string[];
  sources: string[];
  buildingInfo?: string;
} {
  const { buildingContext, leaseSummary, outlookContext } = context;
  
  const replyFacts: string[] = [];
  const sources: string[] = [];
  
  // Add building context facts
  if (buildingContext?.buildingName) {
    replyFacts.push(`Building: ${buildingContext.buildingName}`);
    if (buildingContext.unitNumber) {
      replyFacts.push(`Unit: ${buildingContext.unitNumber}`);
    }
  }
  
  // Add lease summary facts
  if (leaseSummary) {
    if (leaseSummary.parties?.landlord) {
      replyFacts.push(`Landlord: ${leaseSummary.parties.landlord.name}`);
    }
    if (leaseSummary.parties?.leaseholder) {
      replyFacts.push(`Leaseholder: ${leaseSummary.parties.leaseholder.name}`);
    }
    if (leaseSummary.term?.start_date) {
      replyFacts.push(`Lease Start: ${leaseSummary.term.start_date}`);
    }
    if (leaseSummary.term?.end_date) {
      replyFacts.push(`Lease End: ${leaseSummary.term.end_date}`);
    }
    
    sources.push('Lease Lab Analysis');
  }
  
  // Add Outlook context facts
  if (outlookContext?.from) {
    replyFacts.push(`Original Sender: ${outlookContext.from}`);
  }
  if (outlookContext?.subject) {
    replyFacts.push(`Subject: ${outlookContext.subject}`);
  }
  if (outlookContext?.receivedDateTime) {
    replyFacts.push(`Received: ${outlookContext.receivedDateTime}`);
  }
  
  const buildingInfo = buildingContext?.buildingName 
    ? `${buildingContext.buildingName}${buildingContext.unitNumber ? `, Unit ${buildingContext.unitNumber}` : ''}`
    : undefined;
  
  return {
    replyFacts,
    sources,
    buildingInfo
  };
}

/**
 * Process user input for acronyms and domain validation
 */
export function processUserInput(input: string): {
  processedInput: string;
  acronymsFound: string[];
  isOutOfScope: boolean;
  needsClarification: string[];
} {
  const acronymsFound: string[] = [];
  const needsClarification: string[] = [];
  
  // Check for acronyms
  const acronymRegex = /\b[A-Z]{2,6}\b/g;
  const matches = input.match(acronymRegex);
  
  if (matches) {
    for (const match of matches) {
      if (PROPERTY_ACRONYMS[match]) {
        acronymsFound.push(match);
      } else if (!isOutOfScope(match)) {
        needsClarification.push(match);
      }
    }
  }
  
  // Expand acronyms in input
  const processedInput = expandAcronymsInText(input);
  
  // Check if out of scope
  const isOutOfScopeResult = isOutOfScope(input);
  
  return {
    processedInput,
    acronymsFound,
    isOutOfScope: isOutOfScopeResult,
    needsClarification
  };
}

/**
 * Generate structured reply response
 */
export function generateReplyResponse(
  subjectSuggestion: string,
  bodyHtml: string,
  usedFacts: string[],
  sources: string[]
): {
  subjectSuggestion: string;
  bodyHtml: string;
  usedFacts: string[];
  sources: string[];
  metadata: {
    generatedAt: string;
    factCount: number;
    sourceCount: number;
  };
} {
  return {
    subjectSuggestion,
    bodyHtml,
    usedFacts,
    sources,
    metadata: {
      generatedAt: new Date().toISOString(),
      factCount: usedFacts.length,
      sourceCount: sources.length
    }
  };
}
