import OpenAI from 'openai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { getContext } from './getContext';
import { saveDraft, getDraft } from './draftMemory';

export type AIMode = 'ask' | 'generate_reply' | 'transform_reply' | 'classify_document';
export type Tone = 'Holding' | 'SolicitorFormal' | 'ResidentNotice' | 'SupplierRequest' | 'CasualChaser';

export interface AIRequest {
  mode: AIMode;
  input: string;
  threadId?: string;
  tone?: Tone;
  contextHints?: {
    building_id?: string;
    email_id?: string;
    document_ids?: string[];
    leaseholder_id?: string;
    unit_number?: string;
  };
  emailData?: {
    subject?: string;
    body?: string;
    from_email?: string;
    categories?: string[];
    flag_status?: string;
  };
}

export interface AIResponse {
  success: boolean;
  content: string;
  subject?: string;
  placeholders?: string[];
  context?: {
    building_name?: string;
    leaseholder_name?: string;
    sources?: string[];
  };
  draft_id?: string;
}

export class PromptEngine {
  private openai: OpenAI;
  private supabase: any;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  async runAI(request: AIRequest): Promise<AIResponse> {
    try {
      // Initialize Supabase client
      this.supabase = createRouteHandlerClient<Database>({ cookies });
      
      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('Unauthorized');
      }

      // Fetch context based on mode and hints
      const context = await getContext(request.contextHints, this.supabase);
      
      // Handle transform mode - get previous draft
      let previousDraft = null;
      if (request.mode === 'transform_reply' && request.threadId) {
        previousDraft = await getDraft(request.threadId);
        if (!previousDraft) {
          throw new Error('No previous draft found for transformation');
        }
      }

      // Build system prompt based on mode and tone
      const systemPrompt = this.buildSystemPrompt(request, context, previousDraft);
      
      // Build user prompt
      const userPrompt = this.buildUserPrompt(request, context, previousDraft);
      
      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1200,
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content || '';
      
      if (!content) {
        throw new Error('OpenAI returned empty response');
      }

      // Extract subject if present
      const subject = this.extractSubject(content);
      const cleanContent = this.cleanContent(content);
      
      // Check for placeholders
      const placeholders = this.detectPlaceholders(cleanContent);
      
      // Save draft if applicable
      let draftId: string | undefined;
      if (request.threadId && (request.mode === 'generate_reply' || request.mode === 'transform_reply')) {
        draftId = await saveDraft({
          threadId: request.threadId,
          subject: subject || request.emailData?.subject || 'Draft Email',
          bodyHtml: cleanContent,
          bodyText: this.stripHtml(cleanContent),
          tone: request.tone || 'CasualChaser',
          context: {
            building_id: request.contextHints?.building_id,
            leaseholder_id: request.contextHints?.leaseholder_id,
            unit_number: request.contextHints?.unit_number,
            mode: request.mode,
            original_input: request.input
          }
        });
      }

      return {
        success: true,
        content: cleanContent,
        subject,
        placeholders,
        context: {
          building_name: context.building?.name,
          leaseholder_name: context.leaseholder?.name,
          sources: context.sources
        },
        draft_id: draftId
      };

    } catch (error: any) {
      console.error('Error in PromptEngine:', error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  private buildSystemPrompt(request: AIRequest, context: any, previousDraft: any): string {
    const basePrompt = `You are BlocIQ, an expert AI assistant for UK leasehold property managers. You must follow these rules strictly:

🔒 CORE RULES:
- Use British English spelling throughout (analyse, summarise, organise, recognise, apologise, customise, centre, defence)
- Always use "Kind regards" as sign-off (no comma) unless user specifically requests otherwise
- Format dates as DD/MM/YYYY (British format)
- Never fabricate facts - say "Information not available" if context missing
- Preserve all dates, numbers, and legal references from context
- Use leasehold terminology (leaseholder, freeholder, managing agent, not tenant/landlord)
- Reference UK legislation where applicable (Landlord and Tenant Act 1985/1987, Building Safety Act 2022)

🎯 MODE: ${request.mode.toUpperCase()}
${request.tone ? `🎭 TONE: ${request.tone}` : ''}

${this.getToneInstructions(request.tone)}

🏢 BUILDING CONTEXT:
${context.building ? `Building: ${context.building.name}
Address: ${context.building.address || 'Not specified'}
Units: ${context.building.unit_count || 'Unknown'}` : 'No building context available'}

${context.leaseholder ? `👤 LEASEHOLDER: ${context.leaseholder.name}
Email: ${context.leaseholder.email || 'Not provided'}
Phone: ${context.leaseholder.phone || 'Not provided'}` : ''}

${context.compliance?.length ? `⚠️ COMPLIANCE ISSUES:
${context.compliance.map(item => `- ${item.item_name} (${item.status}, due: ${item.next_due})`).join('\n')}` : ''}

${context.documents?.length ? `📄 RELEVANT DOCUMENTS:
${context.documents.map(doc => `- ${doc.doc_name} (${doc.doc_type})`).join('\n')}` : ''}

${context.emails?.length ? `📧 RELATED EMAILS:
${context.emails.map(email => `- ${email.subject} (${email.from_email})`).join('\n')}` : ''}`;

    if (request.mode === 'transform_reply' && previousDraft) {
      return basePrompt + `

🔄 TRANSFORM MODE INSTRUCTIONS:
- Maintain the exact subject line: "${previousDraft.subject}"
- Preserve all factual information, dates, and legal references
- Apply only the requested style/content changes
- Keep the same structure and length
- Do not add new information not present in the original`;
    }

    return basePrompt;
  }

  private buildUserPrompt(request: AIRequest, context: any, previousDraft: any): string {
    if (request.mode === 'transform_reply' && previousDraft) {
      return `Transform this email draft according to the request: "${request.input}"

ORIGINAL DRAFT:
Subject: ${previousDraft.subject}
Body: ${previousDraft.body_text}

Please apply the requested changes while preserving all factual information and structure.`;
    }

    if (request.mode === 'generate_reply') {
      return `Generate a new email ${request.tone ? `in ${request.tone} tone` : ''} based on this request: "${request.input}"

${request.emailData?.subject ? `Original Subject: ${request.emailData.subject}` : ''}
${request.emailData?.body ? `Original Content: ${request.emailData.body}` : ''}
${request.emailData?.from_email ? `From: ${request.emailData.from_email}` : ''}

Please create a professional, contextually appropriate response.`;
    }

    if (request.mode === 'ask') {
      return `Question: ${request.input}

Please provide a comprehensive answer using the available building and leaseholder context. If information is missing, clearly state what is not available.`;
    }

    return request.input;
  }

  private getToneInstructions(tone?: Tone): string {
    switch (tone) {
      case 'Holding':
        return `📝 HOLDING TONE:
- Polite and concise
- Ask for status/update with specific date request
- Maximum 150 words
- Professional but not overly formal`;
      
      case 'SolicitorFormal':
        return `⚖️ SOLICITOR FORMAL TONE:
- Legal and precise language
- Cite relevant legislation if applicable
- Formal greeting and structure
- Professional legal terminology`;
      
      case 'ResidentNotice':
        return `🏠 RESIDENT NOTICE TONE:
- Clear and informative
- Reference lease obligations where relevant
- Explain communal impact
- Professional but accessible`;
      
      case 'SupplierRequest':
        return `🔧 SUPPLIER REQUEST TONE:
- Direct and specific scope description
- Include urgency if needed
- Thank supplier for their service
- Professional and respectful`;
      
      case 'CasualChaser':
        return `😊 CASUAL CHASER TONE:
- Light and friendly
- Maintain relationship
- Soft ask/reminder
- Professional but warm`;
      
      default:
        return `📝 DEFAULT TONE:
- Professional and helpful
- Appropriate for general communication
- Clear and actionable`;
    }
  }

  private extractSubject(content: string): string | undefined {
    const subjectMatch = content.match(/^Subject:\s*(.+)$/m);
    return subjectMatch ? subjectMatch[1].trim() : undefined;
  }

  private cleanContent(content: string): string {
    // Remove subject line if present
    return content.replace(/^Subject:\s*.+$/m, '').trim();
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  private detectPlaceholders(content: string): string[] {
    const placeholders: string[] = [];
    
    if (!content.includes('[PLACEHOLDER]')) {
      // Check for missing critical information
      if (!content.match(/Dear\s+[A-Z][a-z]+\s+[A-Z][a-z]+/)) {
        placeholders.push('recipient_name');
      }
      
      if (!content.match(/[A-Z][a-z]+\s+(House|Court|Building|Manor|Gardens)/)) {
        placeholders.push('building_name');
      }
      
      if (!content.match(/\d{5}\s*[A-Z]{1,2}/)) {
        placeholders.push('postcode');
      }
    } else {
      // Extract specific placeholders
      const matches = content.match(/\[PLACEHOLDER:([^\]]+)\]/g);
      if (matches) {
        placeholders.push(...matches.map(m => m.replace(/\[PLACEHOLDER:([^\]]+)\]/, '$1')));
      }
    }
    
    return placeholders;
  }
}

// Export singleton instance
export const promptEngine = new PromptEngine();
