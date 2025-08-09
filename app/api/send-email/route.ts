import { NextResponse } from 'next/server';
import { getOutlookClient } from '@/lib/outlookClient';
import { sanitizeEmailHtml } from '@/utils/emailFormatting';

export async function POST(req: Request) {
  try {
    const { to = [], cc = [], subject = '', htmlBody = '', attachments = [] } = await req.json();

    // Validate required fields
    if (!Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'Recipient list (to) is required' }, { status: 400 });
    }

    if (!subject?.trim()) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    if (!htmlBody?.trim()) {
      return NextResponse.json({ error: 'Email body is required' }, { status: 400 });
    }

    // Get authenticated Graph client
    const client = await getOutlookClient();

    // Sanitize HTML body
    const sanitizedHtml = sanitizeEmailHtml(htmlBody);

    // Build message object for Microsoft Graph
    const message: any = {
      subject: subject.trim(),
      toRecipients: to.map((address: string) => ({ 
        emailAddress: { address: address.trim() } 
      })),
      body: { 
        contentType: 'HTML', 
        content: sanitizedHtml 
      },
    };

    // Add CC recipients if provided
    if (Array.isArray(cc) && cc.length > 0) {
      message.ccRecipients = cc.map((address: string) => ({ 
        emailAddress: { address: address.trim() } 
      }));
    }

    // Add attachments if provided
    if (Array.isArray(attachments) && attachments.length > 0) {
      message.attachments = attachments.map((attachment: any) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.name,
        contentBytes: attachment.contentBytesBase64,
        contentType: attachment.contentType || 'application/octet-stream',
      }));
    }

    // Send the email via Microsoft Graph
    await client.api('/me/sendMail').post({ 
      message, 
      saveToSentItems: true 
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send email failed:', error?.message || error);
    
    // Handle specific error cases
    if (error?.message?.includes('not authenticated')) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    if (error?.message?.includes('Outlook not connected')) {
      return NextResponse.json({ error: 'Outlook not connected. Please connect your Outlook account first.' }, { status: 400 });
    }
    
    if (error?.message?.includes('Graph API error: 403')) {
      return NextResponse.json({ error: 'Permission denied. Please ensure your Outlook account has Mail.Send permission.' }, { status: 403 });
    }
    
    const msg = error?.message || 'Failed to send email';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
