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

    // Get emails from Microsoft Graph API
    const response = await makeGraphRequest('/me/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,receivedDateTime,from,toRecipients,isRead,hasAttachments,importance,conversationId')

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Graph API error:', errorText)
      throw new Error(`Failed to fetch emails: ${response.statusText}`)
    }

    const data = await response.json()
    const emails = data.value || []

    // Process and save emails to database
    const savedEmails = []
    const errors = []

    for (const email of emails) {
      try {
        // Check if email already exists
        const { data: existingEmail } = await supabase
          .from('incoming_emails')
          .select('id')
          .eq('microsoft_id', email.id)
          .single()

        if (existingEmail) {
          // Email already exists, skip
          continue
        }

        // Extract email addresses
        const fromEmail = email.from?.emailAddress?.address || ''
        const toEmails = email.toRecipients?.map((recipient: any) => recipient.emailAddress?.address).filter(Boolean) || []

        // Save email to database
        const { data: savedEmail, error: saveError } = await supabase
          .from('incoming_emails')
          .insert({
            microsoft_id: email.id,
            subject: email.subject || 'No Subject',
            body_preview: email.bodyPreview || '',
            received_date: email.receivedDateTime,
            from_email: fromEmail,
            to_emails: toEmails,
            is_read: email.isRead || false,
            has_attachments: email.hasAttachments || false,
            importance: email.importance || 'normal',
            conversation_id: email.conversationId,
            user_id: session.user.id
          })
          .select()
          .single()

        if (saveError) {
          console.error('Error saving email:', saveError)
          errors.push({ emailId: email.id, error: saveError.message })
        } else {
          savedEmails.push(savedEmail)
        }

      } catch (error) {
        console.error('Error processing email:', error)
        errors.push({ emailId: email.id, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${savedEmails.length} new emails`,
      synced_count: savedEmails.length,
      total_processed: emails.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Sync inbox error:', error)
    return NextResponse.json({ 
      error: 'Failed to sync inbox',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Check if user has connected Outlook
    const hasConnection = await hasOutlookConnection()
    
    return NextResponse.json({
      connected: hasConnection,
      message: hasConnection ? 'Outlook is connected' : 'Outlook is not connected'
    })

  } catch (error) {
    console.error('Check connection error:', error)
    return NextResponse.json({ 
      error: 'Failed to check connection',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 