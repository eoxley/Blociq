/**
 * Outlook Add-in Reply Adapter
 * 
 * Generates professional email replies using deterministic facts and lease data
 * with strict domain locking and British English requirements.
 */

import { createClient } from '@/utils/supabase/server';
import { parseAddinIntent, extractBuildingContext } from '../intent/parseAddinIntent';
import { buildReplyContext, generateReplyResponse } from '../prompt/addinPrompt';
import { getFounderGuidance } from '@/lib/ai/founder';
import { buildAIContext } from '@/lib/buildAIContext';

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
        
        const response = generateReplyResponse(
          subjectSuggestion,
          bodyHtml,
          replyContext.replyFacts,
          replyContext.sources
        );

        // Add confidence level to metadata
        return {
          ...response,
          metadata: {
            ...response.metadata,
            confidence: 'high' as const
          }
        };
        
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
 * Simple reply adapter function for the generate-reply endpoint
 */
export async function addinReplyAdapter(params: {
  userInput: string;
  outlookContext: any;
  buildingContext?: any;
  leaseSummary?: any;
  userId: string;
}): Promise<{
  success: boolean;
  bodyHtml?: string;
  subjectSuggestion?: string;
  usedFacts?: string[];
  sources?: string[];
  message?: string;
}> {
  try {
    const { userInput, outlookContext, buildingContext, leaseSummary, userId } = params;

    // Get user profile from Supabase
    const supabase = createClient();
    let userProfile = null;
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name, job_title, company_name, signature_text')
        .eq('id', userId)
        .single();

      if (profile) {
        userProfile = profile;
      }
    } catch (error) {
      console.warn('Could not load user profile:', error);
    }

    // Create reply context with BlocIQ data
    const context: ReplyContext = {
      userInput,
      outlookContext,
      buildingContext,
      leaseSummary,
      userSettings: {
        signature: userProfile?.signature_text ||
                  `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() ||
                  'BlocIQ Property Management',
        tone: 'formal'
      }
    };
    
    // Generate reply using the existing adapter
    const adapter = createAddinReplyAdapter();
    const result = await adapter.generateReply(context);
    
    return {
      success: true,
      bodyHtml: result.bodyHtml,
      subjectSuggestion: result.subjectSuggestion,
      usedFacts: result.usedFacts,
      sources: result.sources
    };
    
  } catch (error) {
    console.error('Addin Reply Adapter error:', error);
    return {
      success: false,
      message: 'Failed to generate reply'
    };
  }
}

/**
 * Generate BlocIQ-aware contextual reply using building and lease knowledge
 */
async function generateContextualReply(
  context: ReplyContext,
  replyContext: { replyFacts: string[]; sources: string[] }
): Promise<string> {
  const { outlookContext, buildingContext, leaseSummary } = context;

  if (!outlookContext?.bodyPreview && !outlookContext?.subject) {
    return '<p>I can help you draft an email, but I need more specific information about what type of email you\'d like to send.</p>\n\n';
  }

  try {
    // Build comprehensive BlocIQ context
    let blociqContext = 'BlocIQ KNOWLEDGE BASE:\n\n';

    // Get founder knowledge for email topic
    const emailContent = `${outlookContext.subject || ''} ${outlookContext.bodyPreview || ''}`.toLowerCase();
    let founderGuidance = '';

    try {
      const topicHints = [];
      if (emailContent.includes('section 20') || emailContent.includes('s20')) {
        topicHints.push('section20', 'consultation');
      }
      if (emailContent.includes('repair') || emailContent.includes('maintenance')) {
        topicHints.push('repairs', 'maintenance');
      }
      if (emailContent.includes('service charge')) {
        topicHints.push('service_charge', 'financials');
      }
      if (emailContent.includes('compliance') || emailContent.includes('safety')) {
        topicHints.push('compliance', 'safety');
      }
      if (emailContent.includes('insurance')) {
        topicHints.push('insurance', 'claims');
      }

      const guidance = await getFounderGuidance({
        topicHints,
        contexts: ['core', 'complaints'],
        limit: 3
      });

      if (guidance && typeof guidance === 'string') {
        founderGuidance = guidance;
      } else if (Array.isArray(guidance) && guidance.length > 0) {
        founderGuidance = guidance.map((item: any) => item.content || item).join('\n\n');
      }
    } catch (error) {
      console.warn('Could not fetch founder guidance:', error);
    }

    // Add founder knowledge to context
    if (founderGuidance) {
      blociqContext += `FOUNDER GUIDANCE:\n${founderGuidance}\n\n`;
    }

    // Get comprehensive building context if building ID is available
    if (buildingContext?.buildingId) {
      try {
        const fullBuildingContext = await buildAIContext(buildingContext.buildingId);
        if (fullBuildingContext) {
          blociqContext += `BUILDING DATA:\n${fullBuildingContext}\n\n`;
        }
      } catch (error) {
        console.warn('Could not fetch comprehensive building context:', error);
        // Fall back to basic building context
        if (buildingContext?.buildingName) {
          blociqContext += `Building: ${buildingContext.buildingName}\n`;
          if (buildingContext.unitNumber) {
            blociqContext += `Unit: ${buildingContext.unitNumber}\n`;
          }
        }
      }
    } else if (buildingContext?.buildingName) {
      // Basic building context if no ID available
      blociqContext += `BUILDING CONTEXT:\n`;
      blociqContext += `Building: ${buildingContext.buildingName}\n`;
      if (buildingContext.unitNumber) {
        blociqContext += `Unit: ${buildingContext.unitNumber}\n`;
      }
    }

    // Add lease summary context
    if (leaseSummary) {
      blociqContext += '\nLEASE ANALYSIS DATA:\n';
      if (leaseSummary.parties?.landlord) {
        blociqContext += `Landlord: ${leaseSummary.parties.landlord.name}\n`;
      }
      if (leaseSummary.parties?.leaseholder) {
        blociqContext += `Leaseholder: ${leaseSummary.parties.leaseholder.name}\n`;
      }
      if (leaseSummary.financials?.service_charge) {
        blociqContext += `Service Charge: £${leaseSummary.financials.service_charge.annual_amount}/year\n`;
      }
      if (leaseSummary.repair_matrix && leaseSummary.repair_matrix.length > 0) {
        blociqContext += 'Repair Obligations:\n';
        leaseSummary.repair_matrix.slice(0, 3).forEach((repair: any) => {
          blociqContext += `- ${repair.item}: ${repair.responsible_party}\n`;
        });
      }
      if (leaseSummary.term?.end_date) {
        blociqContext += `Lease Expiry: ${leaseSummary.term.end_date}\n`;
      }
    }

    // If no specific BlocIQ data, add generic property management context
    if (!buildingContext && !leaseSummary && !founderGuidance) {
      blociqContext += 'No specific building or lease data available in BlocIQ system.\n';
    }

    // Use BlocIQ-aware prompt with founder guidance
    const prompt = `You are the BlocIQ Outlook Add-in Assistant for UK leasehold block management.

${blociqContext}

EMAIL TO REPLY TO:
From: ${outlookContext.from || 'Sender'}
Subject: ${outlookContext.subject || 'No Subject'}
Content: ${outlookContext.bodyPreview || 'No preview available'}

IMPORTANT INSTRUCTIONS:
1. Generate a professional British English reply
2. Use the BlocIQ knowledge base provided above - including founder guidance, building data, and lease information
3. If founder guidance is provided, incorporate relevant best practices and expert insights
4. If specific information isn't in the BlocIQ data, state "Not specified in the lease/building records"
5. Reference specific lease clauses, repair obligations, building details, or compliance information when relevant
6. Stay within UK leasehold block management domain
7. Be helpful but factual - never invent information
8. For repairs, service charges, Section 20, compliance, or safety matters, use the comprehensive data provided
9. Follow any relevant founder guidance for tone, approach, and professional standards
10. Acknowledge receipt and address main points professionally
11. Return only the main body content (no greeting or signature)

Generate an appropriate reply using the complete BlocIQ knowledge base:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are the BlocIQ Outlook Add-in Assistant for UK leasehold block management. Use only provided building and lease data. Never invent facts. Use British English and professional property management terminology.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content?.trim();

    if (aiReply) {
      return `<p>${aiReply.replace(/\n/g, '</p>\n<p>')}</p>\n\n`;
    }

  } catch (error) {
    console.error('Error generating BlocIQ contextual reply:', error);
  }

  // BlocIQ-aware fallback
  let fallback = '<p>Thank you for your email. I have received your message and will review it in the context of ';
  if (buildingContext?.buildingName) {
    fallback += `${buildingContext.buildingName}`;
    if (buildingContext.unitNumber) {
      fallback += `, Unit ${buildingContext.unitNumber}`;
    }
  } else {
    fallback += 'the property management requirements';
  }
  fallback += '.</p>\n\n';

  if (leaseSummary) {
    fallback += '<p>I have access to the lease analysis data and will provide a detailed response addressing your specific query.</p>\n\n';
  } else {
    fallback += '<p>For detailed lease-specific information, please upload the lease document to BlocIQ Lease Lab for analysis.</p>\n\n';
  }

  return fallback;
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
  
  // Use AI to generate contextual reply for all emails - this is the main content
  const contextualReply = await generateContextualReply(context, replyContext);
  body += contextualReply;
  
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
