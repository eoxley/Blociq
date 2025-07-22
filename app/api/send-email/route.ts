import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { makeGraphRequest, hasOutlookConnection } from '@/lib/outlookAuth'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Check if user has connected Outlook
    const hasConnection = await hasOutlookConnection()
    if (!hasConnection) {
      return NextResponse.json({ 
        error: 'Outlook not connected', 
        message: 'Please connect your Outlook account first' 
      }, { status: 400 })
    }

    // Check if request is FormData (with attachments) or JSON
    const contentType = req.headers.get('content-type') || '';
    let to: string[], cc: string[] = [], bcc: string[] = [], subject: string, body: string, replyTo: string = '';
    let attachments: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with attachments
      const formData = await req.formData();
      
      const toData = formData.get('to');
      const ccData = formData.get('cc');
      const subjectData = formData.get('subject');
      const bodyData = formData.get('body');
      const replyToData = formData.get('replyTo');
      
      to = toData ? JSON.parse(toData as string) : [];
      cc = ccData ? JSON.parse(ccData as string) : [];
      subject = subjectData as string;
      body = bodyData as string;
      replyTo = replyToData as string;
      
      // Extract attachments
      for (let i = 0; i < 10; i++) { // Limit to 10 attachments
        const attachment = formData.get(`attachment_${i}`) as File;
        if (attachment) {
          attachments.push(attachment);
        }
      }
    } else {
      // Handle JSON request (backward compatibility)
      const jsonData = await req.json();
      to = Array.isArray(jsonData.to) ? jsonData.to : [jsonData.to];
      cc = jsonData.cc ? (Array.isArray(jsonData.cc) ? jsonData.cc : [jsonData.cc]) : [];
      bcc = jsonData.bcc ? (Array.isArray(jsonData.bcc) ? jsonData.bcc : [jsonData.bcc]) : [];
      subject = jsonData.subject;
      body = jsonData.body;
      replyTo = jsonData.replyTo || '';
    }

    if (!to || to.length === 0 || !subject || !body) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        message: 'To, subject, and body are required' 
      }, { status: 400 })
    }

    // Prepare email data for Microsoft Graph API
    const emailData = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: body
        },
        toRecipients: to.map(email => ({ emailAddress: { address: email } })),
        ...(cc.length > 0 && { ccRecipients: cc.map(email => ({ emailAddress: { address: email } })) }),
        ...(bcc.length > 0 && { bccRecipients: bcc.map(email => ({ emailAddress: { address: email } })) }),
        ...(replyTo && { replyTo: [{ emailAddress: { address: replyTo } }] })
      },
      saveToSentItems: true
    }

    // If there are attachments, we need to create a draft first, add attachments, then send
    if (attachments.length > 0) {
      // Create draft
      const draftResponse = await makeGraphRequest('/me/messages', {
        method: 'POST',
        body: JSON.stringify(emailData.message)
      });

      if (!draftResponse.ok) {
        throw new Error(`Failed to create draft: ${draftResponse.statusText}`);
      }

      const draft = await draftResponse.json();
      const messageId = draft.id;

      // Add attachments to the draft
      for (const attachment of attachments) {
        const attachmentData = {
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: attachment.name,
          contentType: attachment.type,
          contentBytes: Buffer.from(await attachment.arrayBuffer()).toString('base64')
        };

        const attachmentResponse = await makeGraphRequest(`/me/messages/${messageId}/attachments`, {
          method: 'POST',
          body: JSON.stringify(attachmentData)
        });

        if (!attachmentResponse.ok) {
          console.error(`Failed to add attachment ${attachment.name}:`, await attachmentResponse.text());
        }
      }

      // Send the draft
      const sendResponse = await makeGraphRequest(`/me/messages/${messageId}/send`, {
        method: 'POST'
      });

      if (!sendResponse.ok) {
        throw new Error(`Failed to send email with attachments: ${sendResponse.statusText}`);
      }
    } else {
      // Send email directly via Microsoft Graph API (no attachments)
      const response = await makeGraphRequest('/me/sendMail', {
        method: 'POST',
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Send email error:', errorText);
        throw new Error(`Failed to send email: ${response.statusText}`);
      }
    }

    // Log the sent email to database
    const { error: logError } = await supabase
      .from('outgoing_emails')
      .insert({
        to_emails: Array.isArray(to) ? to : [to],
        cc_emails: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
        bcc_emails: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
        subject,
        body,
        reply_to: replyTo,
        user_id: session.user.id,
        sent_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Error logging sent email:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ 
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
