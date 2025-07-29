import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to truncate strings to database limits
function truncateString(str: string | null | undefined, maxLength: number): string {
  if (!str) return ''
  return str.length > maxLength ? str.substring(0, maxLength) : str
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Helper function to clean and validate email data
function validateEmailData(email: any): any {
  const messageId = email.id
  if (!messageId) {
    console.log('⚠️ Skipping email without ID')
    return null
  }

  // Extract and validate from email
  const fromEmail = email.from?.emailAddress?.address || ''
  const fromName = email.from?.emailAddress?.name || ''
  
  if (!fromEmail || !isValidEmail(fromEmail)) {
    console.log('⚠️ Skipping email with invalid from address:', fromEmail)
    return null
  }

  // Extract recipient emails as array
  const toEmails = (email.toRecipients || [])
    .map((r: any) => r.emailAddress?.address)
    .filter((email: string) => email && isValidEmail(email))

  // Extract CC emails as array
  const ccEmails = (email.ccRecipients || [])
    .map((r: any) => r.emailAddress?.address)
    .filter((email: string) => email && isValidEmail(email))

  // Validate and truncate all fields according to database schema
  const validatedEmail = {
    subject: truncateString(email.subject || 'No Subject', 255),
    from_email: truncateString(fromEmail, 255),
    from_name: truncateString(fromName, 255),
    to_email: toEmails.length > 0 ? toEmails.join(', ') : '', // Store as string for compatibility
    cc_email: ccEmails, // Store as array as per database schema
    body: truncateString(email.body?.content || '', 10000), // Allow longer for email body
    body_preview: truncateString(email.bodyPreview || '', 500), // Limit preview
    received_at: email.receivedDateTime || new Date().toISOString(),
    outlook_message_id: truncateString(messageId, 255),
    thread_id: truncateString(email.conversationId, 255),
    unread: !email.isRead,
    handled: false,
    building_id: null,
    leaseholder_id: null,
  }

  return validatedEmail
}

export async function POST() {
  const outlookEmail = 'testbloc@blociq.co.uk'

  try {
    console.log('🔄 Starting email sync for:', outlookEmail)

    // 1. Get stored Outlook token
    const { data: tokenRow, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('email', outlookEmail)
      .single()

    if (tokenError || !tokenRow) {
      console.error('❌ No Outlook token found:', tokenError?.message)
      return NextResponse.json(
        { error: 'No valid Outlook token found. Please reconnect Outlook.' },
        { status: 401 }
      )
    }

    let accessToken = tokenRow.access_token

    // 2. Check if token is expired and refresh if needed
    const now = new Date()
    const expiresAt = new Date(tokenRow.expires_at)
    
    if (now >= expiresAt) {
      console.log('🔄 Token expired, refreshing...')
      
      const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.OUTLOOK_CLIENT_ID!,
          client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: tokenRow.refresh_token,
        }),
      })

      if (!refreshResponse.ok) {
        console.error('❌ Failed to refresh token')
        return NextResponse.json(
          { error: 'Failed to refresh Outlook token. Please reconnect Outlook.' },
          { status: 401 }
        )
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token

      // Update the token in Supabase
      await supabase
        .from('outlook_tokens')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('email', outlookEmail)

      console.log('✅ Token refreshed successfully')
    }

    // 3. Fetch emails from Microsoft Graph API
    console.log('📥 Fetching emails from Outlook...')
    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=20&$orderby=receivedDateTime desc', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!graphRes.ok) {
      const errorText = await graphRes.text()
      console.error('❌ Graph API Error:', graphRes.status, errorText)
      return NextResponse.json(
        { error: `Failed to fetch emails from Outlook: ${graphRes.status}` },
        { status: graphRes.status }
      )
    }

    const { value: emails } = await graphRes.json()
    console.log(`📧 Found ${emails.length} emails in Outlook`)

    // 4. Process and validate emails
    const validEmails = []
    const skippedEmails = []
    
    for (const email of emails) {
      const validatedEmail = validateEmailData(email)
      if (validatedEmail) {
        validEmails.push(validatedEmail)
      } else {
        skippedEmails.push(email.id)
      }
    }

    console.log(`✅ Validated ${validEmails.length} emails, skipped ${skippedEmails.length}`)

    // 5. Check for duplicates and insert new emails
    const emailInserts = []
    let duplicateCount = 0
    
    for (const email of validEmails) {
      try {
        // Check if email already exists
        const { data: existing, error: checkError } = await supabase
          .from('incoming_emails')
          .select('id')
          .eq('outlook_message_id', email.outlook_message_id)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for new emails
          console.error('❌ Error checking for duplicates:', checkError.message)
          continue
        }

        if (existing) {
          console.log(`⏭️ Skipping duplicate email: ${email.subject}`)
          duplicateCount++
          continue
        }

        emailInserts.push(email)
        console.log(`✅ Prepared email: ${email.subject}`)
      } catch (error) {
        console.error('❌ Error processing email:', error)
        continue
      }
    }

    // 6. Insert new emails into Supabase with individual error handling
    let insertSuccessCount = 0
    let insertErrorCount = 0

    if (emailInserts.length > 0) {
      console.log(`💾 Inserting ${emailInserts.length} new emails...`)
      
      for (const email of emailInserts) {
        try {
          const { error: insertError } = await supabase
            .from('incoming_emails')
            .insert([email])

          if (insertError) {
            console.error('❌ Insert failed for message:', email.outlook_message_id, insertError.message)
            insertErrorCount++
          } else {
            console.log(`✅ Successfully inserted: ${email.subject}`)
            insertSuccessCount++
          }
        } catch (error) {
          console.error('❌ Exception during insert for message:', email.outlook_message_id, error)
          insertErrorCount++
        }
      }
    } else {
      console.log('✅ No new emails to sync')
    }

    const summary = {
      success: true,
      totalFound: emails.length,
      validEmails: validEmails.length,
      skippedEmails: skippedEmails.length,
      duplicateCount,
      attemptedInserts: emailInserts.length,
      successfulInserts: insertSuccessCount,
      failedInserts: insertErrorCount,
      message: `Sync completed: ${insertSuccessCount} emails synced, ${insertErrorCount} failed`
    }

    console.log('📊 Sync Summary:', summary)

    return NextResponse.json(summary)

  } catch (error) {
    console.error('❌ Email sync error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during email sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
