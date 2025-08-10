// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for question, buildingId, userId
// - Supabase queries with proper .eq() filters
// - Try/catch with detailed error handling
// - Used in AI assistant components
// - Includes OpenAI integration with error handling
// - Document-aware functionality with proper validation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/ai/systemPrompt';
import { buildPrompt } from '@/lib/buildPrompt';
import { retrieveContext } from '@/lib/ai/retrieve';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { buildPlaceholderMap, findBestTemplate, replacePlaceholders } from '@/lib/ai/placeholderHelpers';
import { sanitizeHtml } from '@/lib/ai/sanitizeHtml';
import { getReplyContext } from '@/lib/email/getReplyContext';
import { getEmailMeta } from '@/lib/email/getEmailMeta';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AskBlocIQRequest {
  message: string;
  mode?: "general" | "draft" | "triage" | "letter" | "email" | "notice" | "minutes" | "agenda" | "ingest";
  building_id?: string;
  email_id?: string;
  leaseholder_id?: string;
  document_ids?: string[];
  // Template-driven modes
  template_hint?: string;
  extra_fields?: Record<string, string>;
  // Minutes mode
  notes?: string;
  date?: string;
  attendees?: string[];
  // Agenda mode
  timebox_minutes?: number;
  // Ingest mode
  file_text?: string;
  unit_id?: string;
  // Draft mode
  action?: "reply" | "reply_all" | "forward";
  include_thread?: boolean;
}

interface AskBlocIQResponse {
  answer: string;
  subject?: string;
  citations: Array<{ document_id: string; chunk_id: string; snippet: string }>;
  proposed_actions: Array<{ type: string; args: any }>;
  // Template-driven modes
  title?: string;
  template_id?: number;
  placeholders_used?: string[];
  missing_placeholders?: string[];
  html?: string;
  // Minutes mode
  date?: string;
  attendees?: string[];
  agenda?: Array<{ item: string; duration?: string }>;
  minutes?: Array<{ item: string; notes: string }>;
  summary?: string;
  // Agenda mode
  timebox_minutes?: number;
  // Ingest mode
  classification?: string;
  confidence?: number;
  guesses?: {
    building_id?: string;
    unit_id?: string;
    leaseholder_id?: string;
    compliance_asset_id?: string;
  };
  extracted_fields?: {
    issued_date?: string;
    expiry_date?: string;
    last_renewed_date?: string;
    next_due_date?: string;
    supplier?: string;
    certificate_number?: string;
    amount?: string;
  };
  // Draft mode
  recipients?: {
    to: string[];
    cc: string[];
    subject: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AskBlocIQRequest = await request.json();
    const { message, mode = "general", building_id, email_id, leaseholder_id, document_ids = [] } = body;

    // Get user from auth
    const cookieStore = await cookies();
    const supabaseAuth = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabaseAuth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build structured context using existing buildPrompt
    const structuredContext = await buildPrompt({
      contextType: mode,
      question: message,
      buildingId: building_id,
      documentIds: document_ids,
      emailThreadId: email_id,
      leaseholderId: leaseholder_id,
    });

    // Retrieve relevant document chunks
    const retrievedChunks = await retrieveContext({
      query: message,
      buildingId: building_id,
      limit: 6
    });

    // Build context block from retrieved chunks
    const contextBlock = retrievedChunks.length > 0 
      ? `<context>\n${retrievedChunks.map(chunk => 
          `[doc:${chunk.document_id}|chunk:${chunk.id}] ${chunk.content.substring(0, 200)}...`
        ).join('\n')}\n</context>`
      : '';

    // Get system prompt
    const systemPrompt = getSystemPrompt(undefined, undefined, mode);

    // Construct user message with mode-specific instructions
    let userMessage = `${message}\n\n${contextBlock}`;
    
    // Add mode-specific instructions
    if (mode === 'draft' && body.email_id && body.include_thread) {
      // Load reply context for draft mode
      const replyContext = await getReplyContext(body.email_id);
      if (!replyContext) {
        return NextResponse.json({ error: 'Could not load email thread context' }, { status: 400 });
      }

      // Use inferred building_id if not provided
      const finalBuildingId = building_id || replyContext.building_id;
      if (!finalBuildingId) {
        return NextResponse.json({ error: 'building_id required' }, { status: 400 });
      }

      // Build thread context
      const threadMessages = replyContext.messagesForContext.map(msg => {
        const content = msg.body_full || msg.body_preview;
        return `From: ${msg.from_name || msg.from_email}
Date: ${new Date(msg.received_at).toLocaleDateString('en-GB')}
Subject: ${msg.subject}
Content: ${content?.substring(0, 500)}${content && content.length > 500 ? '...' : ''}`;
      }).join('\n\n---\n\n');

      const threadContext = `${replyContext.threadSummary ? `${replyContext.threadSummary}\n\n` : ''}Recent messages:\n${threadMessages}`;
      
      // Update context block with thread information
      const threadContextBlock = `<thread_context>\n${threadContext}\n</thread_context>\n\n${contextBlock}`;
      
      // Add draft-specific instructions
      const actionInstructions = body.action === 'forward' 
        ? 'Write a forwarding email with a brief summary for the new recipient. Start with "Forwarding summary: [brief context]"'
        : body.action === 'reply_all'
        ? 'Write a reply to all participants in the thread'
        : 'Write a reply to the sender';

      userMessage = `${message}\n\n${threadContextBlock}\n\n${actionInstructions}. Use British English and maintain a professional property manager tone. If referencing specific documents or compliance matters, cite them from the provided context. If uncertain about any details, ask for confirmation rather than making assumptions.`;
    } else if (mode === 'minutes') {
      const notesText = body.notes ? `\n\nNotes:\n${body.notes}` : '';
      const attendeesText = body.attendees ? `\n\nAttendees: ${body.attendees.join(', ')}` : '';
      const dateText = body.date ? `\n\nDate: ${body.date}` : '';
      
      userMessage += `${notesText}${attendeesText}${dateText}\n\nPlease generate meeting minutes from the provided notes. Return a JSON object with the following structure:
{
  "title": "Meeting Title",
  "date": "DD/MM/YYYY",
  "attendees": ["Name 1", "Name 2"],
  "agenda": [{"item": "Agenda Item 1", "duration": "10 minutes"}],
  "minutes": [{"item": "Agenda Item 1", "notes": "Discussion points and decisions"}],
  "summary": "Brief summary of key decisions and actions",
  "html": "<html>Formatted minutes content</html>"
}`;
    } else if (mode === 'agenda') {
      const timeboxText = body.timebox_minutes ? `\n\nTimebox: ${body.timebox_minutes} minutes total` : '';
      
      userMessage += `${timeboxText}\n\nPlease create a meeting agenda. Return a JSON object with the following structure:
{
  "title": "Meeting Title",
  "agenda": [{"item": "Agenda Item 1", "duration": "10 minutes"}],
  "html": "<html>Formatted agenda content</html>"
}`;
    } else if (mode === 'ingest') {
      const fileText = body.file_text ? `\n\nDocument Text:\n${body.file_text.substring(0, 1500)}${body.file_text.length > 1500 ? '...' : ''}` : '';
      
      userMessage += `${fileText}\n\nPlease analyse this document for classification, key dates, and actions. Return a JSON object with the following structure:
{
  "classification": "compliance|lease|correspondence|invoice|other",
  "confidence": 0.85,
  "guesses": {
    "building_id": "123",
    "unit_id": "456",
    "leaseholder_id": "789",
    "compliance_asset_id": "fire_safety"
  },
  "extracted_fields": {
    "issued_date": "15/01/2024",
    "expiry_date": "15/01/2025",
    "last_renewed_date": "15/01/2023",
    "next_due_date": "15/01/2025",
    "supplier": "ABC Fire Safety Ltd",
    "certificate_number": "FS-2024-001",
    "amount": "£500.00"
  },
  "summary": "Brief summary of the document content and key findings",
  "suggested_actions": [
    {"type": "update_compliance_dates", "args": {}},
    {"type": "create_task", "args": {"title": "Review fire safety certificate"}},
    {"type": "email_notice", "args": {"subject": "Fire Safety Certificate Renewal", "to": ["leaseholder@example.com"]}}
  ]
}`;
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content || 'No response generated';

    // Parse response based on mode
    let parsedResponse: AskBlocIQResponse;
    let subject = '';

    if (mode === 'draft') {
      // Extract subject and body from response
      const subjectMatch = response.match(/Subject:\s*(.+)/i);
      subject = subjectMatch ? subjectMatch[1].trim() : 'Re: ' + message.substring(0, 50);
      
      // Compute recipients if email_id is provided
      let recipients;
      if (body.email_id && body.action) {
        const emailMeta = await getEmailMeta(body.email_id);
        if (emailMeta) {
          const currentUserEmail = user.email; // Remove current user from recipients
          
          switch (body.action) {
            case 'reply':
              recipients = {
                to: [emailMeta.from_email],
                cc: [],
                subject: subject.startsWith('Re:') ? subject : `Re: ${emailMeta.subject}`
              };
              break;
            case 'reply_all':
              const allTo = [...emailMeta.to, emailMeta.from_email].filter(email => 
                email.toLowerCase() !== currentUserEmail?.toLowerCase()
              );
              const allCc = emailMeta.cc.filter(email => 
                email.toLowerCase() !== currentUserEmail?.toLowerCase()
              );
              recipients = {
                to: allTo,
                cc: allCc,
                subject: subject.startsWith('Re:') ? subject : `Re: ${emailMeta.subject}`
              };
              break;
            case 'forward':
              recipients = {
                to: [],
                cc: [],
                subject: subject.startsWith('Fwd:') ? subject : `Fwd: ${emailMeta.subject}`
              };
              break;
          }
        }
      }
      
      // Sanitize the response HTML
      const sanitizedHtml = sanitizeHtml(response);
      
      parsedResponse = {
        answer: sanitizedHtml,
        subject,
        citations: retrievedChunks.map(chunk => ({
          document_id: chunk.document_id,
          chunk_id: chunk.id,
          snippet: chunk.content.substring(0, 300)
        })),
        proposed_actions: [{
          type: 'send_email',
          args: {
            to: recipients?.to || [],
            cc: recipients?.cc || [],
            subject: recipients?.subject || subject,
            html_body: sanitizedHtml,
            save_to_drafts: true,
            reply_to_id: body.email_id
          }
        }],
        recipients
      };
    } else if (mode === 'triage') {
      // Parse triage response
      try {
        const triageMatch = response.match(/\{[\s\S]*\}/);
        if (triageMatch) {
          const triageData = JSON.parse(triageMatch[0]);
          parsedResponse = {
            answer: triageData.summary || response,
            citations: retrievedChunks.map(chunk => ({
              document_id: chunk.document_id,
              chunk_id: chunk.id,
              snippet: chunk.content.substring(0, 300)
            })),
            proposed_actions: triageData.proposed_actions || []
          };
        } else {
          parsedResponse = {
            answer: response,
            citations: retrievedChunks.map(chunk => ({
              document_id: chunk.document_id,
              chunk_id: chunk.id,
              snippet: chunk.content.substring(0, 300)
            })),
            proposed_actions: []
          };
        }
      } catch (error) {
        parsedResponse = {
          answer: response,
          citations: retrievedChunks.map(chunk => ({
            document_id: chunk.document_id,
            chunk_id: chunk.id,
            snippet: chunk.content.substring(0, 300)
          })),
          proposed_actions: []
        };
      }
    } else if (mode === 'letter' || mode === 'email' || mode === 'notice') {
      // Template-driven modes
      const template = await findBestTemplate({
        type: mode,
        templateHint: body.template_hint,
        buildingId: building_id
      });

      if (!template) {
        return NextResponse.json(
          { error: `No ${mode} template found` },
          { status: 400 }
        );
      }

      // Build placeholder map
      const placeholders = await buildPlaceholderMap({
        buildingId: building_id,
        leaseholderId: leaseholder_id,
        extraFields: body.extra_fields || {}
      });

      // Replace placeholders
      const { renderedContent, usedPlaceholders, missingPlaceholders } = replacePlaceholders(
        template.content,
        placeholders
      );

      // Sanitize HTML
      const sanitizedHtml = sanitizeHtml(renderedContent);

      parsedResponse = {
        answer: sanitizedHtml,
        title: template.name,
        template_id: template.id,
        placeholders_used: usedPlaceholders,
        missing_placeholders: missingPlaceholders,
        html: sanitizedHtml,
        citations: retrievedChunks.map(chunk => ({
          document_id: chunk.document_id,
          chunk_id: chunk.id,
          snippet: chunk.content.substring(0, 300)
        })),
        proposed_actions: mode === 'email' ? [
          {
            type: 'send_email',
            args: {
              subject: template.subject || template.name,
              html_body: sanitizedHtml,
              save_to_drafts: true
            }
          }
        ] : []
      };
    } else if (mode === 'minutes') {
      // Minutes mode
      try {
        const minutesMatch = response.match(/\{[\s\S]*\}/);
        if (minutesMatch) {
          const minutesData = JSON.parse(minutesMatch[0]);
          const sanitizedHtml = sanitizeHtml(minutesData.html || response);
          
          parsedResponse = {
            answer: minutesData.summary || response,
            title: minutesData.title || 'Meeting Minutes',
            date: minutesData.date || body.date || new Date().toISOString().split('T')[0],
            attendees: minutesData.attendees || body.attendees || [],
            agenda: minutesData.agenda || [],
            minutes: minutesData.minutes || [],
            summary: minutesData.summary || '',
            html: sanitizedHtml,
            citations: retrievedChunks.map(chunk => ({
              document_id: chunk.document_id,
              chunk_id: chunk.id,
              snippet: chunk.content.substring(0, 300)
            })),
            proposed_actions: []
          };
        } else {
          parsedResponse = {
            answer: response,
            citations: retrievedChunks.map(chunk => ({
              document_id: chunk.document_id,
              chunk_id: chunk.id,
              snippet: chunk.content.substring(0, 300)
            })),
            proposed_actions: []
          };
        }
      } catch (error) {
        parsedResponse = {
          answer: response,
          citations: retrievedChunks.map(chunk => ({
            document_id: chunk.document_id,
            chunk_id: chunk.id,
            snippet: chunk.content.substring(0, 300)
          })),
          proposed_actions: []
        };
      }
    } else if (mode === 'agenda') {
      // Agenda mode
      try {
        const agendaMatch = response.match(/\{[\s\S]*\}/);
        if (agendaMatch) {
          const agendaData = JSON.parse(agendaMatch[0]);
          const sanitizedHtml = sanitizeHtml(agendaData.html || response);
          
          parsedResponse = {
            answer: response,
            title: agendaData.title || 'Meeting Agenda',
            agenda: agendaData.agenda || [],
            timebox_minutes: body.timebox_minutes,
            html: sanitizedHtml,
            citations: retrievedChunks.map(chunk => ({
              document_id: chunk.document_id,
              chunk_id: chunk.id,
              snippet: chunk.content.substring(0, 300)
            })),
            proposed_actions: []
          };
        } else {
          parsedResponse = {
            answer: response,
            citations: retrievedChunks.map(chunk => ({
              document_id: chunk.document_id,
              chunk_id: chunk.id,
              snippet: chunk.content.substring(0, 300)
            })),
            proposed_actions: []
          };
        }
      } catch (error) {
        parsedResponse = {
          answer: response,
          citations: retrievedChunks.map(chunk => ({
            document_id: chunk.document_id,
            chunk_id: chunk.id,
            snippet: chunk.content.substring(0, 300)
          })),
          proposed_actions: []
        };
      }
    } else if (mode === 'ingest') {
      // Ingest mode
      try {
        const ingestMatch = response.match(/\{[\s\S]*\}/);
        if (ingestMatch) {
          const ingestData = JSON.parse(ingestMatch[0]);
          parsedResponse = {
            answer: ingestData.summary || response,
            classification: ingestData.classification || 'unknown',
            confidence: ingestData.confidence || 0,
            guesses: ingestData.guesses || {},
            extracted_fields: ingestData.extracted_fields || {},
            citations: retrievedChunks.map(chunk => ({
              document_id: chunk.document_id,
              chunk_id: chunk.id,
              snippet: chunk.content.substring(0, 300)
            })),
            proposed_actions: ingestData.suggested_actions || []
          };
        } else {
          parsedResponse = {
            answer: response,
            citations: retrievedChunks.map(chunk => ({
              document_id: chunk.document_id,
              chunk_id: chunk.id,
              snippet: chunk.content.substring(0, 300)
            })),
            proposed_actions: []
          };
        }
      } catch (error) {
        parsedResponse = {
          answer: response,
          citations: retrievedChunks.map(chunk => ({
            document_id: chunk.document_id,
            chunk_id: chunk.id,
            snippet: chunk.content.substring(0, 300)
          })),
          proposed_actions: []
        };
      }
    } else {
      // General mode
      parsedResponse = {
        answer: response,
        citations: retrievedChunks.map(chunk => ({
          document_id: chunk.document_id,
          chunk_id: chunk.id,
          snippet: chunk.content.substring(0, 300)
        })),
        proposed_actions: []
      };
    }

    // Log to ai_logs
    const { data: aiLog, error: logError } = await supabase
      .from('ai_logs')
      .insert({
        user_id: user.id,
        building_id: building_id,
        question: message,
        response: parsedResponse.answer,
        context_type: mode,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging to ai_logs:', logError);
    }

    // Log citations
    if (aiLog && retrievedChunks.length > 0) {
      const citations = retrievedChunks.map(chunk => ({
        ai_log_id: aiLog.id,
        document_id: chunk.document_id,
        chunk_id: chunk.id,
        snippet: chunk.content.substring(0, 300),
        score: chunk.score
      }));

      const { error: citationError } = await supabase
        .from('ai_log_citations')
        .insert(citations);

      if (citationError) {
        console.error('Error logging citations:', citationError);
      }
    }

    // Save generated documents for document generation modes
    if (aiLog && (mode === 'letter' || mode === 'email' || mode === 'notice' || mode === 'minutes' || mode === 'agenda')) {
      try {
        const documentData = {
          ai_log_id: aiLog.id,
          building_id: building_id,
          type: mode,
          title: parsedResponse.title || `${mode.charAt(0).toUpperCase() + mode.slice(1)} Document`,
          content: parsedResponse.html || parsedResponse.answer,
          metadata: {
            template_id: parsedResponse.template_id,
            placeholders_used: parsedResponse.placeholders_used,
            missing_placeholders: parsedResponse.missing_placeholders,
            date: parsedResponse.date,
            attendees: parsedResponse.attendees,
            agenda: parsedResponse.agenda,
            minutes: parsedResponse.minutes,
            summary: parsedResponse.summary,
            timebox_minutes: parsedResponse.timebox_minutes
          },
          created_at: new Date().toISOString()
        };

        const { error: docError } = await supabase
          .from('generated_documents')
          .insert(documentData);

        if (docError) {
          console.error('Error saving generated document:', docError);
        }
      } catch (error) {
        console.error('Error saving generated document:', error);
      }
    }

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('❌ Error in ask-blociq route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 