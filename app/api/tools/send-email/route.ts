import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createOutlookClient } from '@/lib/outlookClient';
import { sanitizeEmailHtml } from '@/lib/ai/sanitizeHtml';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SendEmailRequest {
  to: string[];
  cc?: string[];
  subject: string;
  html_body: string;
  reply_to_id?: string;
  save_to_drafts?: boolean;
  ai_log_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json();
    const { to, cc, subject, html_body, reply_to_id, save_to_drafts = true, ai_log_id } = body;

    // Validate inputs
    if (!to || to.length === 0) {
      return NextResponse.json({ error: 'Recipients are required' }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!html_body) {
      return NextResponse.json({ error: 'Email body is required' }, { status: 400 });
    }

    let result: any;
    let status: 'success' | 'error' = 'success';

    try {
      // Sanitize HTML before sending
      const sanitizedHtml = sanitizeEmailHtml(html_body);
      
      // Create Outlook client
      const outlookClient = await createOutlookClient();

      if (save_to_drafts !== false) {
        // Save to drafts
        const draft = await outlookClient.messages.create({
          subject,
          body: {
            contentType: 'HTML',
            content: sanitizedHtml
          },
          toRecipients: to.map(email => ({ emailAddress: { address: email } })),
          ...(cc && cc.length > 0 && {
            ccRecipients: cc.map(email => ({ emailAddress: { address: email } }))
          }),
          ...(reply_to_id && {
            replyTo: [{ emailAddress: { address: reply_to_id } }]
          })
        });

        result = { ok: true, mode: 'draft', outlook_id: draft.id };
      } else {
        // Send immediately
        const message = await outlookClient.messages.create({
          subject,
          body: {
            contentType: 'HTML',
            content: sanitizedHtml
          },
          toRecipients: to.map(email => ({ emailAddress: { address: email } })),
          ...(cc && cc.length > 0 && {
            ccRecipients: cc.map(email => ({ emailAddress: { address: email } }))
          }),
          ...(reply_to_id && {
            replyTo: [{ emailAddress: { address: reply_to_id } }]
          })
        });

        await message.send();
        result = { ok: true, mode: 'send', outlook_id: message.id };
      }

    } catch (error) {
      console.error('Error sending email:', error);
      status = 'error';
      result = { error: 'Failed to send email' };
    }

    // Log tool call
    await supabase.from('ai_tool_calls').insert({
      ai_log_id,
      tool_name: 'send_email',
      args: { to, cc, subject, html_body: html_body.substring(0, 1000), reply_to_id, save_to_drafts },
      result,
      status
    });

    if (status === 'error') {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in send-email tool:', error);
    
    // Log error tool call
    try {
      await supabase.from('ai_tool_calls').insert({
        tool_name: 'send_email',
        args: { error: 'Request parsing failed' },
        result: { error: 'Internal server error' },
        status: 'error'
      });
    } catch (logError) {
      console.error('Error logging tool call:', logError);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
