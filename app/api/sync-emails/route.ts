import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc', {
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

    // 4. Process and deduplicate emails
    const emailInserts = []
    
    for (const email of emails) {
      const messageId = email.id

      // Check if email already exists
      const { data: existing } = await supabase
        .from('incoming_emails')
        .select('id')
        .eq('outlook_message_id', messageId)
        .single()

      if (existing) {
        console.log(`⏭️ Skipping duplicate email: ${email.subject}`)
        continue
      }

      // Extract recipient emails
      const toEmails = (email.toRecipients || [])
        .map((r: any) => r.emailAddress?.address)
        .filter(Boolean)
        .join(', ')

      // Extract CC emails
      const ccEmails = (email.ccRecipients || [])
        .map((r: any) => r.emailAddress?.address)
        .filter(Boolean)
        .join(', ')

      // Create email record
      const emailRecord = {
        subject: email.subject || 'No Subject',
        from_email: email.from?.emailAddress?.address || '',
        from_name: email.from?.emailAddress?.name || '',
        to_email: toEmails,
        cc_email: ccEmails,
        body: email.body?.content || '',
        body_preview: email.bodyPreview || '',
        received_at: email.receivedDateTime,
        outlook_message_id: messageId,
        thread_id: email.conversationId,
        unread: !email.isRead,
        handled: false,
        building_id: null, // Will be assigned later if needed
        leaseholder_id: null, // Will be assigned later if needed
      }

      emailInserts.push(emailRecord)
      console.log(`✅ Prepared email: ${email.subject}`)
    }

    // 5. Insert new emails into Supabase
    if (emailInserts.length > 0) {
      console.log(`💾 Inserting ${emailInserts.length} new emails...`)
      
      const { error: insertError } = await supabase
        .from('incoming_emails')
        .insert(emailInserts)

      if (insertError) {
        console.error('❌ Error inserting emails:', insertError.message)
        return NextResponse.json(
          { error: `Failed to insert emails: ${insertError.message}` },
          { status: 500 }
        )
      }

      console.log(`✅ Successfully synced ${emailInserts.length} emails`)
    } else {
      console.log('✅ No new emails to sync')
    }

    return NextResponse.json({
      success: true,
      synced: emailInserts.length,
      total: emails.length,
      message: `Successfully synced ${emailInserts.length} new emails from Outlook`
    })

  } catch (error) {
    console.error('❌ Email sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error during email sync' },
      { status: 500 }
    )
  }
}
