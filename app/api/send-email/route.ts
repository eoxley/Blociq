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

    const { to, subject, body, cc, bcc, replyTo } = await req.json()

    if (!to || !subject || !body) {
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
        toRecipients: Array.isArray(to) ? to.map(email => ({ emailAddress: { address: email } })) : [{ emailAddress: { address: to } }],
        ...(cc && { ccRecipients: Array.isArray(cc) ? cc.map(email => ({ emailAddress: { address: email } })) : [{ emailAddress: { address: cc } }] }),
        ...(bcc && { bccRecipients: Array.isArray(bcc) ? bcc.map(email => ({ emailAddress: { address: email } })) : [{ emailAddress: { address: bcc } }] }),
        ...(replyTo && { replyTo: [{ emailAddress: { address: replyTo } }] })
      },
      saveToSentItems: true
    }

    // Send email via Microsoft Graph API
    const response = await makeGraphRequest('/me/sendMail', {
      method: 'POST',
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Send email error:', errorText)
      throw new Error(`Failed to send email: ${response.statusText}`)
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
