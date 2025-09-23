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
    to?: string[];
    cc?: string[];
    bodyHtml?: string; // Full email body HTML
    conversationId?: string;
    internetMessageId?: string;
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
        
        // Generate reply body using unified Ask BlocIQ
        const replyResult = await generateReplyBody(context, replyContext);

        // Extract facts and sources from the Ask BlocIQ response
        const actualFacts = replyResult.facts || replyContext.replyFacts;
        const actualSources = replyResult.sources || replyContext.sources;

        const response = generateReplyResponse(
          subjectSuggestion,
          replyResult.bodyHtml || replyResult,
          actualFacts,
          actualSources
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
 * Extract sender's name from email address or from line for proper salutation
 */
function extractSenderInfo(fromField: string): { firstName?: string; title?: string; surname?: string; fullName?: string } {
  if (!fromField) return {};

  // Clean up the from field - remove email address if present
  let name = fromField.replace(/<[^>]*>/g, '').replace(/[""]/g, '').trim();

  // If it's just an email address, extract the part before @
  if (name.includes('@') && !name.includes(' ')) {
    name = name.split('@')[0].replace(/[._]/g, ' ');
  }

  // Common title patterns
  const titlePattern = /^(Mr|Mrs|Ms|Miss|Dr|Prof|Sir|Dame|Lord|Lady|Rev)\s+(.+)/i;
  const titleMatch = name.match(titlePattern);

  if (titleMatch) {
    const title = titleMatch[1];
    const remaining = titleMatch[2].trim();
    const nameParts = remaining.split(/\s+/);

    if (nameParts.length === 1) {
      return { title, surname: nameParts[0] };
    } else {
      return { title, firstName: nameParts[0], surname: nameParts.slice(1).join(' ') };
    }
  }

  // Split into parts
  const nameParts = name.split(/\s+/).filter(part => part.length > 0);

  if (nameParts.length === 1) {
    return { firstName: nameParts[0] };
  } else if (nameParts.length >= 2) {
    return {
      firstName: nameParts[0],
      surname: nameParts.slice(1).join(' '),
      fullName: name
    };
  }

  return { fullName: name };
}

/**
 * Generate appropriate salutation based on sender information
 */
function generateSalutation(senderInfo: { firstName?: string; title?: string; surname?: string; fullName?: string }): string {
  if (senderInfo.title && senderInfo.surname) {
    return `Dear ${senderInfo.title} ${senderInfo.surname}`;
  } else if (senderInfo.firstName) {
    return `Dear ${senderInfo.firstName}`;
  } else if (senderInfo.fullName) {
    return `Dear ${senderInfo.fullName}`;
  }
  return 'Dear Sir/Madam';
}

/**
 * Extract and summarize the subject/issue from email content
 */
function summarizeEmailSubject(subject?: string, bodyPreview?: string): string {
  if (!subject && !bodyPreview) return 'your inquiry';

  // Use subject if available, otherwise extract from body
  let topic = subject || bodyPreview || '';

  // Clean up common email prefixes
  topic = topic.replace(/^(Re:|RE:|Fwd:|FW:|FWD:)\s*/i, '').trim();

  // Lowercase for analysis but keep original case for display
  const lowerTopic = topic.toLowerCase();

  // Common property management topics
  if (lowerTopic.includes('leak') || lowerTopic.includes('water')) return 'the water ingress issue';
  if (lowerTopic.includes('repair') || lowerTopic.includes('maintenance')) return 'the repair matter';
  if (lowerTopic.includes('service charge')) return 'the service charge inquiry';
  if (lowerTopic.includes('section 20') || lowerTopic.includes('s20')) return 'the Section 20 consultation';
  if (lowerTopic.includes('insurance')) return 'the insurance matter';
  if (lowerTopic.includes('noise') || lowerTopic.includes('neighbour')) return 'the neighbour issue';
  if (lowerTopic.includes('compliance') || lowerTopic.includes('safety')) return 'the compliance matter';
  if (lowerTopic.includes('ground rent')) return 'the ground rent inquiry';
  if (lowerTopic.includes('lease')) return 'the lease matter';
  if (lowerTopic.includes('parking') || lowerTopic.includes('car')) return 'the parking issue';
  if (lowerTopic.includes('garden') || lowerTopic.includes('balcony')) return 'the garden/balcony matter';

  // If topic is short, use it directly
  if (topic.length <= 50) {
    return topic.toLowerCase();
  }

  // Truncate long topics
  return topic.substring(0, 50).trim() + '...';
}

/**
 * Detect formal/legal tone in email content
 */
function detectFormalTone(content: string): boolean {
  const formalIndicators = [
    'pursuant to', 'in accordance with', 'hereby', 'whereas', 'heretofore',
    'statutory', 'breach of', 'legal action', 'solicitor', 'tribunal',
    'notice to quit', 'forfeiture', 'breach of covenant', 'demand',
    'without prejudice', 'subject to contract', 'lease provisions'
  ];

  const lowerContent = content.toLowerCase();
  return formalIndicators.some(indicator => lowerContent.includes(indicator));
}

/**
 * Generate BlocIQ-aware contextual reply using building and lease knowledge with new reply rules
 */
async function generateContextualReply(
  context: ReplyContext,
  replyContext: { replyFacts: string[]; sources: string[] }
): Promise<{ content: string; facts?: string[]; sources?: string[] }> {
  const { outlookContext, buildingContext, leaseSummary, userSettings } = context;

  if (!outlookContext?.bodyPreview && !outlookContext?.subject) {
    return {
      content: '<p>I can help you draft an email, but I need more specific information about what type of email you\'d like to send.</p>\n\n',
      facts: [],
      sources: []
    };
  }

  try {
    // Extract sender information for proper salutation
    const senderInfo = extractSenderInfo(outlookContext.from || '');
    const salutation = generateSalutation(senderInfo);

    // Summarize the email subject/issue
    const subjectSummary = summarizeEmailSubject(outlookContext.subject, outlookContext.bodyPreview);

    // Detect if formal tone is required
    const emailContent = `${outlookContext.subject || ''} ${outlookContext.bodyPreview || ''}`;
    const isFormalTone = detectFormalTone(emailContent);
    const signOff = isFormalTone ? 'Yours sincerely' : 'Kind regards';

    // Build comprehensive email thread context
    let emailThreadText = '';

    // Include full email thread information
    if (outlookContext.subject) {
      emailThreadText += `Subject: ${outlookContext.subject}\n`;
    }
    if (outlookContext.from) {
      emailThreadText += `From: ${outlookContext.from}\n`;
    }
    if (outlookContext.to && outlookContext.to.length > 0) {
      emailThreadText += `To: ${outlookContext.to.join(', ')}\n`;
    }
    if (outlookContext.cc && outlookContext.cc.length > 0) {
      emailThreadText += `CC: ${outlookContext.cc.join(', ')}\n`;
    }
    if (outlookContext.receivedDateTime) {
      emailThreadText += `Received: ${new Date(outlookContext.receivedDateTime).toLocaleString('en-GB')}\n`;
    }

    // Prioritize full email body content over preview
    if (outlookContext.bodyHtml) {
      // Strip HTML tags for plain text processing but preserve structure
      const bodyText = outlookContext.bodyHtml
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      emailThreadText += `Full Email Content: ${bodyText}\n`;
    } else if (outlookContext.bodyPreview) {
      emailThreadText += `Message Preview: ${outlookContext.bodyPreview}\n`;
    }

    if (outlookContext.conversationId) {
      emailThreadText += `Conversation ID: ${outlookContext.conversationId}\n`;
    }

    // Build comprehensive BlocIQ knowledge context
    let knowledgeContext = '';

    // Get founder knowledge for email topic
    let founderGuidance = '';
    try {
      const topicHints = [];
      const lowerContent = emailContent.toLowerCase();

      if (lowerContent.includes('section 20') || lowerContent.includes('s20')) {
        topicHints.push('section20', 'consultation');
      }
      if (lowerContent.includes('repair') || lowerContent.includes('maintenance')) {
        topicHints.push('repairs', 'maintenance');
      }
      if (lowerContent.includes('service charge')) {
        topicHints.push('service_charge', 'financials');
      }
      if (lowerContent.includes('compliance') || lowerContent.includes('safety')) {
        topicHints.push('compliance', 'safety');
      }
      if (lowerContent.includes('insurance')) {
        topicHints.push('insurance', 'claims');
      }
      if (lowerContent.includes('leak') || lowerContent.includes('water')) {
        topicHints.push('leaks', 'water_damage');
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
      knowledgeContext += `FOUNDER GUIDANCE:\n${founderGuidance}\n\n`;
    }

    // Get comprehensive building context if building ID is available
    if (buildingContext?.buildingId) {
      try {
        const fullBuildingContext = await buildAIContext(buildingContext.buildingId);
        if (fullBuildingContext) {
          knowledgeContext += `BUILDING DATA:\n${fullBuildingContext}\n\n`;
        }
      } catch (error) {
        console.warn('Could not fetch comprehensive building context:', error);
        // Fall back to basic building context
        if (buildingContext?.buildingName) {
          knowledgeContext += `BUILDING CONTEXT:\n`;
          knowledgeContext += `Building: ${buildingContext.buildingName}\n`;
          if (buildingContext.unitNumber) {
            knowledgeContext += `Unit: ${buildingContext.unitNumber}\n`;
          }
        }
      }
    } else if (buildingContext?.buildingName) {
      // Basic building context if no ID available
      knowledgeContext += `BUILDING CONTEXT:\n`;
      knowledgeContext += `Building: ${buildingContext.buildingName}\n`;
      if (buildingContext.unitNumber) {
        knowledgeContext += `Unit: ${buildingContext.unitNumber}\n`;
      }
    }

    // Add lease summary context
    if (leaseSummary) {
      knowledgeContext += '\nLEASE ANALYSIS DATA:\n';
      if (leaseSummary.parties?.landlord) {
        knowledgeContext += `Landlord: ${leaseSummary.parties.landlord.name}\n`;
      }
      if (leaseSummary.parties?.leaseholder) {
        knowledgeContext += `Leaseholder: ${leaseSummary.parties.leaseholder.name}\n`;
      }
      if (leaseSummary.financials?.service_charge) {
        knowledgeContext += `Service Charge: £${leaseSummary.financials.service_charge.annual_amount}/year\n`;
      }
      if (leaseSummary.repair_matrix && leaseSummary.repair_matrix.length > 0) {
        knowledgeContext += 'Repair Obligations:\n';
        leaseSummary.repair_matrix.slice(0, 3).forEach((repair: any) => {
          knowledgeContext += `- ${repair.item}: ${repair.responsible_party}\n`;
        });
      }
      if (leaseSummary.term?.end_date) {
        knowledgeContext += `Lease Expiry: ${leaseSummary.term.end_date}\n`;
      }
    }

    // Construct the structured prompt for the AI with new reply rules
    const structuredPrompt = `You are generating an email reply following these specific rules:

EMAIL THREAD CONTEXT:
${emailThreadText}

KNOWLEDGE BASE:
${knowledgeContext || 'No specific building or lease data available in BlocIQ system.'}

REPLY REQUIREMENTS:
1. Start with salutation: "${salutation}"
2. Open with: "Thank you for your email regarding ${subjectSummary}."
3. Generate contextual body using the email thread and knowledge base
4. Close with: "${signOff}"
5. The user's signature will be appended automatically
6. Remove any generic placeholders or boilerplate text
7. Use British English throughout
8. Be specific and reference actual data from the knowledge base when available

Generate a professional email reply that follows these rules exactly.`;

    // Call the unified Ask BlocIQ endpoint with the structured prompt
    const askBlocIQUrl = process.env.NODE_ENV === 'production'
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/supabase/', '')}/api/ask-ai`
      : 'http://localhost:3000/api/ask-ai';

    const response = await fetch(askBlocIQUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: structuredPrompt,
        building_id: buildingContext?.buildingId,
        context_type: 'email_reply',
        intent: 'REPLY',
        subject: outlookContext.subject,
        from: outlookContext.from,
        bodyPreview: outlookContext.bodyPreview,
        is_public: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ask BlocIQ API failed: ${response.status}`);
    }

    const data = await response.json();
    const aiReply = data.result || data.response;

    if (aiReply) {
      // Extract facts and sources from the Ask BlocIQ response context
      const contextData = data.context || {};
      const extractedFacts = [];
      const extractedSources = [];

      // Add building information if available
      if (contextData.buildingName) {
        extractedFacts.push(`Building: ${contextData.buildingName}`);
        extractedSources.push('BlocIQ Building Database');
      }

      // Add compliance information if available
      if (contextData.complianceCount > 0) {
        extractedFacts.push(`Compliance items: ${contextData.complianceCount} items tracked`);
        extractedSources.push('BlocIQ Compliance System');
      }

      // Add leaseholder information if available
      if (contextData.leaseholderCount > 0) {
        extractedFacts.push(`Leaseholders: ${contextData.leaseholderCount} residents`);
        extractedSources.push('BlocIQ Leaseholder Database');
      }

      // Add communications context if available
      if (contextData.communicationsCount > 0) {
        extractedFacts.push(`Recent communications: ${contextData.communicationsCount} messages`);
        extractedSources.push('BlocIQ Communications Log');
      }

      // Add search results if available
      if (contextData.searchResultsFound) {
        extractedSources.push('BlocIQ Property Search');
      }

      // Add comprehensive search metadata if available
      if (contextData.searchMetadata) {
        const metadata = contextData.searchMetadata;
        if (metadata.documentsFound > 0) {
          extractedFacts.push(`Documents: ${metadata.documentsFound} relevant documents`);
          extractedSources.push('BlocIQ Document Library');
        }
        if (metadata.leaseholdersFound > 0) {
          extractedSources.push('BlocIQ Leaseholder Records');
        }
      }

      // Format the response properly - ensure it's HTML paragraphs
      let formattedReply = aiReply;

      // If the AI response doesn't contain HTML tags, convert to paragraphs
      if (!formattedReply.includes('<p>') && !formattedReply.includes('<div>')) {
        formattedReply = `<p>${formattedReply.replace(/\n\n/g, '</p>\n<p>').replace(/\n/g, '<br>')}</p>`;
      }

      return {
        content: formattedReply,
        facts: extractedFacts,
        sources: extractedSources
      };
    }

  } catch (error) {
    console.error('Error generating BlocIQ contextual reply:', error);
  }

  // Enhanced fallback following new rules
  const senderInfo = extractSenderInfo(outlookContext?.from || '');
  const salutation = generateSalutation(senderInfo);
  const subjectSummary = summarizeEmailSubject(outlookContext?.subject, outlookContext?.bodyPreview);

  let fallback = `<p>${salutation},</p>\n\n`;
  fallback += `<p>Thank you for your email regarding ${subjectSummary}.</p>\n\n`;

  if (buildingContext?.buildingName) {
    fallback += `<p>I have reviewed your message in the context of ${buildingContext.buildingName}`;
    if (buildingContext.unitNumber) {
      fallback += `, Unit ${buildingContext.unitNumber}`;
    }
    fallback += '.</p>\n\n';
  }

  if (leaseSummary) {
    fallback += '<p>I have access to the lease analysis data and will provide a detailed response addressing your specific query shortly.</p>\n\n';
  } else {
    fallback += '<p>For detailed lease-specific information, I may need to review the relevant lease documentation.</p>\n\n';
  }

  fallback += '<p>Kind regards</p>';

  return {
    content: fallback,
    facts: buildingContext?.buildingName ? [`Building: ${buildingContext.buildingName}`] : [],
    sources: leaseSummary ? ['Lease Lab Analysis'] : []
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
 * Generate reply body HTML following new reply rules
 */
async function generateReplyBody(
  context: ReplyContext,
  replyContext: { replyFacts: string[]; sources: string[]; buildingInfo?: string }
): Promise<{ bodyHtml: string; facts?: string[]; sources?: string[] }> {
  const { userSettings } = context;

  // Use the enhanced contextual reply generation which includes all new rules
  const contextualReply = await generateContextualReply(context, replyContext);

  // The contextual reply now handles the complete email structure
  let body = contextualReply.content;

  // Ensure the signature is properly appended at the end
  const signature = userSettings?.signature || 'BlocIQ Property Management';

  // Check if the body already ends with a signature or sign-off
  if (!body.includes('Kind regards') && !body.includes('Yours sincerely')) {
    body += '<p>Kind regards</p>';
  }

  // Append user signature
  body += `<br><p>${signature}</p>`;

  return {
    bodyHtml: body,
    facts: contextualReply.facts,
    sources: contextualReply.sources
  };
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
