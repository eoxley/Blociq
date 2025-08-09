import { NextRequest, NextResponse } from 'next/server';
import { getOutlookClient } from '@/lib/outlookClient';
import { z } from 'zod';

const Body = z.object({
  to: z.string().min(1),
  cc: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  attachments: z.array(z.object({
    "@odata.type": z.string(),
    name: z.string(),
    contentType: z.string(),
    contentBytes: z.string()
  })).optional()
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { to, cc, subject, body, attachments } = Body.parse(json);

    // Get authenticated Graph client
    const client = await getOutlookClient();

    // Parse recipients
    const parseRecipients = (recipients: string) => {
      if (!recipients.trim()) return [];
      return recipients.split(',').map(email => ({
        emailAddress: {
          address: email.trim()
        }
      }));
    };

    // Build message object
    const message = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: body
      },
      toRecipients: parseRecipients(to),
      ccRecipients: parseRecipients(cc || ''),
      ...(attachments && attachments.length > 0 && { attachments })
    };

    // Send email via Microsoft Graph
    const response = await client.api('/me/sendMail').post({
      message,
      saveToSentItems: true
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      response 
    });

  } catch (err: any) {
    console.error('send-email failed:', err?.message || err);
    
    // Handle specific authentication errors
    if (err?.status === 401) {
      if (err.message?.includes('Outlook not connected')) {
        return NextResponse.json({ 
          error: 'Outlook not connected. Please connect your Outlook account first.',
          code: 'OUTLOOK_NOT_CONNECTED'
        }, { status: 401 });
      } else {
        return NextResponse.json({ 
          error: 'Authentication failed. Please log in again.',
          code: 'AUTH_FAILED'
        }, { status: 401 });
      }
    }

    const code = err?.statusCode || err?.status || 500;
    const msg = code === 403 
      ? 'Permission denied. Ensure Mail.Send is granted.' 
      : err?.message || 'Failed to send email';
    
    return NextResponse.json({ error: msg }, { status: code });
  }
}
