/**
 * Outlook Add-in Reply Adapter
 * 
 * Generates professional email replies using deterministic facts and lease data
 * with strict domain locking and British English requirements.
 */

import { createClient } from '@/utils/supabase/server';
import { parseAddinIntent, extractBuildingContext } from '../intent/parseAddinIntent';
import { buildReplyContext, generateReplyResponse } from '../prompt/addinPrompt';

export interface ReplyAdapterResult {
  subjectSuggestion: string;
  bodyHtml: string;
  usedFacts: string[];
  sources: string[];
  metadata: {
    generatedAt: string;
    factCount: number;
    sourceCount: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

export interface ReplyContext {
  userInput: string;
  outlookContext?: {
    from?: string;
    subject?: string;
    receivedDateTime?: string;
    bodyPreview?: string;
  };
  buildingContext?: {
    buildingId?: string;
    buildingName?: string;
    unitNumber?: string;
  };
  leaseSummary?: any;
  userSettings?: {
    signature?: string;
    tone?: 'formal' | 'friendly' | 'concise';
  };
}

/**
 * Create reply adapter for Outlook Add-in
 */
export function createAddinReplyAdapter() {
  return {
    /**
     * Generate a professional email reply
     */
    async generateReply(context: ReplyContext): Promise<ReplyAdapterResult> {
      try {
        // Build reply context with deterministic facts
        const replyContext = buildReplyContext({
          userInput: context.userInput,
          intent: { intent: 'reply', confidence: 0.9, triggers: ['explicit'] },
          buildingContext: context.buildingContext,
          leaseSummary: context.leaseSummary,
          outlookContext: context.outlookContext,
          userSettings: context.userSettings
        });
        
        // Generate subject suggestion
        const subjectSuggestion = generateSubjectSuggestion(context);
        
        // Generate reply body
        const bodyHtml = await generateReplyBody(context, replyContext);
        
        return generateReplyResponse(
          subjectSuggestion,
          bodyHtml,
          replyContext.replyFacts,
          replyContext.sources
        );
        
      } catch (error) {
        console.error('Reply Adapter error:', error);
        return {
          subjectSuggestion: 'Re: ' + (context.outlookContext?.subject || 'Property Management Query'),
          bodyHtml: '<p>I encountered an error while generating this reply. Please try again or contact support.</p>',
          usedFacts: [],
          sources: [],
          metadata: {
            generatedAt: new Date().toISOString(),
            factCount: 0,
            sourceCount: 0,
            confidence: 'low'
          }
        };
      }
    }
  };
}

/**
 * Generate subject suggestion for reply
 */
function generateSubjectSuggestion(context: ReplyContext): string {
  const originalSubject = context.outlookContext?.subject || '';
  
  // If original subject exists, use "Re: " prefix
  if (originalSubject && !originalSubject.toLowerCase().startsWith('re:')) {
    return `Re: ${originalSubject}`;
  }
  
  // Generate based on content
  const input = context.userInput.toLowerCase();
  
  if (input.includes('section 20') || input.includes('s20')) {
    return 'Re: Section 20 Consultation Requirements';
  } else if (input.includes('repair') || input.includes('maintenance')) {
    return 'Re: Repair Obligations';
  } else if (input.includes('service charge')) {
    return 'Re: Service Charge Query';
  } else if (input.includes('compliance')) {
    return 'Re: Compliance Matter';
  } else if (input.includes('safety')) {
    return 'Re: Building Safety';
  } else {
    return 'Re: Property Management Query';
  }
}

/**
 * Generate reply body HTML
 */
async function generateReplyBody(
  context: ReplyContext,
  replyContext: { replyFacts: string[]; sources: string[]; buildingInfo?: string }
): Promise<string> {
  const { userInput, buildingContext, leaseSummary, userSettings } = context;
  const { replyFacts, sources, buildingInfo } = replyContext;
  
  let body = '';
  
  // Add greeting
  const greeting = generateGreeting(context);
  body += `<p>${greeting}</p>\n\n`;
  
  // Add main content based on query type
  const input = userInput.toLowerCase();
  
  if (input.includes('section 20') || input.includes('s20')) {
    body += await generateSection20Reply(context, replyContext);
  } else if (input.includes('repair') || input.includes('maintenance')) {
    body += await generateRepairReply(context, replyContext);
  } else if (input.includes('service charge')) {
    body += await generateServiceChargeReply(context, replyContext);
  } else if (input.includes('compliance')) {
    body += await generateComplianceReply(context, replyContext);
  } else if (input.includes('safety')) {
    body += await generateSafetyReply(context, replyContext);
  } else {
    body += await generateGenericReply(context, replyContext);
  }
  
  // Add building context if available
  if (buildingInfo) {
    body += `<p><strong>Building:</strong> ${buildingInfo}</p>\n\n`;
  }
  
  // Add lease reference if available
  if (leaseSummary) {
    body += `<p><em>Reference: Lease Lab Analysis - ${leaseSummary.doc_type || 'lease'} document</em></p>\n\n`;
  }
  
  // Add signature
  const signature = userSettings?.signature || 'BlocIQ Property Management';
  body += `<p>Kind regards,<br>${signature}</p>`;
  
  return body;
}

/**
 * Generate appropriate greeting
 */
function generateGreeting(context: ReplyContext): string {
  const from = context.outlookContext?.from;
  
  if (from) {
    // Extract name from email
    const name = from.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `Dear ${name},`;
  }
  
  return 'Dear Sir/Madam,';
}

/**
 * Generate Section 20 specific reply
 */
async function generateSection20Reply(
  context: ReplyContext,
  replyContext: { replyFacts: string[]; sources: string[] }
): Promise<string> {
  const { leaseSummary } = context;
  
  let reply = '<p>Thank you for your enquiry regarding Section 20 consultation requirements.</p>\n\n';
  
  if (leaseSummary?.section20) {
    reply += `<p>Based on the lease analysis, the Section 20 threshold for this building is £${leaseSummary.section20.threshold_amount} per leaseholder.</p>\n\n`;
    
    if (leaseSummary.section20.consultation_required) {
      reply += '<p>The proposed works require Section 20 consultation as they exceed the statutory threshold. The consultation process includes:</p>\n';
      reply += '<ul>\n';
      reply += '<li>Notice of Intention to carry out works</li>\n';
      reply += '<li>Obtaining at least two estimates</li>\n';
      reply += '<li>Notice of Estimates to leaseholders</li>\n';
      reply += '<li>Consideration of leaseholder observations</li>\n';
      reply += '</ul>\n\n';
    }
  } else {
    reply += '<p>Section 20 consultation is required for works costing more than £250 per leaseholder or long-term agreements over £100 per leaseholder per year.</p>\n\n';
    reply += '<p>Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis.</p>\n\n';
  }
  
  reply += '<p>Please let me know if you require any further clarification on the consultation process.</p>\n\n';
  
  return reply;
}

/**
 * Generate repair-specific reply
 */
async function generateRepairReply(
  context: ReplyContext,
  replyContext: { replyFacts: string[]; sources: string[] }
): Promise<string> {
  const { leaseSummary } = context;
  
  let reply = '<p>Thank you for your enquiry regarding repair obligations.</p>\n\n';
  
  if (leaseSummary?.repair_matrix) {
    const repairInfo = leaseSummary.repair_matrix.find((r: any) => 
      r.item?.toLowerCase().includes('repair') || 
      r.item?.toLowerCase().includes('maintenance')
    );
    
    if (repairInfo) {
      reply += `<p>Based on the lease analysis, ${repairInfo.item} is the responsibility of ${repairInfo.responsible_party}.</p>\n\n`;
    } else {
      reply += '<p>The lease analysis does not specify repair obligations for this particular item.</p>\n\n';
    }
  } else {
    reply += '<p>Repair obligations depend on whether the item is demised or common parts, as defined in the lease.</p>\n\n';
    reply += '<p>Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis.</p>\n\n';
  }
  
  reply += '<p>For specific repair matters, I recommend reviewing the relevant lease clauses and arranging an inspection if necessary.</p>\n\n';
  
  return reply;
}

/**
 * Generate service charge specific reply
 */
async function generateServiceChargeReply(
  context: ReplyContext,
  replyContext: { replyFacts: string[]; sources: string[] }
): Promise<string> {
  const { leaseSummary } = context;
  
  let reply = '<p>Thank you for your enquiry regarding service charges.</p>\n\n';
  
  if (leaseSummary?.financials?.service_charge) {
    const sc = leaseSummary.financials.service_charge;
    reply += `<p>Based on the lease analysis, the annual service charge is £${sc.annual_amount} per annum.</p>\n\n`;
    
    if (sc.payment_frequency) {
      reply += `<p>Payment frequency: ${sc.payment_frequency}</p>\n\n`;
    }
    
    if (sc.includes) {
      reply += '<p>This includes:</p>\n<ul>\n';
      sc.includes.forEach((item: string) => {
        reply += `<li>${item}</li>\n`;
      });
      reply += '</ul>\n\n';
    }
  } else {
    reply += '<p>Service charge details vary by lease and building specifications.</p>\n\n';
    reply += '<p>Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis.</p>\n\n';
  }
  
  reply += '<p>For detailed service charge breakdowns, please refer to the annual accounts and budget statements.</p>\n\n';
  
  return reply;
}

/**
 * Generate compliance specific reply
 */
async function generateComplianceReply(
  context: ReplyContext,
  replyContext: { replyFacts: string[]; sources: string[] }
): Promise<string> {
  let reply = '<p>Thank you for your enquiry regarding compliance matters.</p>\n\n';
  
  reply += '<p>Compliance requirements for residential buildings include:</p>\n';
  reply += '<ul>\n';
  reply += '<li>Fire Risk Assessments (FRA)</li>\n';
  reply += '<li>Electrical Installation Condition Reports (EICR)</li>\n';
  reply += '<li>Gas Safety Certificates</li>\n';
  reply += '<li>Asbestos Management Plans</li>\n';
  reply += '<li>Building Insurance</li>\n';
  reply += '</ul>\n\n';
  
  reply += '<p>Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis.</p>\n\n';
  
  reply += '<p>Please let me know if you need specific compliance information for this building.</p>\n\n';
  
  return reply;
}

/**
 * Generate safety specific reply
 */
async function generateSafetyReply(
  context: ReplyContext,
  replyContext: { replyFacts: string[]; sources: string[] }
): Promise<string> {
  let reply = '<p>Thank you for your enquiry regarding building safety.</p>\n\n';
  
  reply += '<p>Building safety requirements include:</p>\n';
  reply += '<ul>\n';
  reply += '<li>Fire Risk Assessments (FRA)</li>\n';
  reply += '<li>Fire Safety Systems maintenance</li>\n';
  reply += '<li>Emergency lighting and signage</li>\n';
  reply += '<li>Fire door inspections</li>\n';
  reply += '<li>External wall system assessments (EWS1)</li>\n';
  reply += '</ul>\n\n';
  
  reply += '<p>Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis.</p>\n\n';
  
  reply += '<p>For urgent safety matters, please contact the building manager or emergency services immediately.</p>\n\n';
  
  return reply;
}

/**
 * Generate generic reply
 */
async function generateGenericReply(
  context: ReplyContext,
  replyContext: { replyFacts: string[]; sources: string[] }
): Promise<string> {
  let reply = '<p>Thank you for your enquiry.</p>\n\n';
  
  reply += '<p>I have reviewed your query and will provide the following information:</p>\n\n';
  
  if (replyContext.replyFacts.length > 0) {
    reply += '<ul>\n';
    replyContext.replyFacts.forEach(fact => {
      reply += `<li>${fact}</li>\n`;
    });
    reply += '</ul>\n\n';
  } else {
    reply += '<p>Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis.</p>\n\n';
  }
  
  reply += '<p>Please let me know if you require any further assistance.</p>\n\n';
  
  return reply;
}
