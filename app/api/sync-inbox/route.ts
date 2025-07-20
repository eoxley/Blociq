import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { makeGraphRequest, hasOutlookConnection } from '@/lib/outlookAuth'

export async function POST(req: NextRequest) {
  console.log("🚀 Starting inbox sync process...")
  
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  // Get the current user's session
  console.log("📋 Getting Supabase user session...")
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    console.error("❌ Authentication failed:", sessionError?.message || "No session found")
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  console.log("✅ Supabase user ID:", session?.user.id)
  console.log("✅ User email:", session?.user.email)

  try {
    // Check if user has connected Outlook
    console.log("🔗 Checking Outlook connection...")
    const hasConnection = await hasOutlookConnection()
    console.log("📡 Outlook connection status:", hasConnection)
    
    if (!hasConnection) {
      console.log("❌ Outlook not connected - returning error")
      return NextResponse.json({ 
        error: 'Outlook not connected', 
        message: 'Please connect your Outlook account first' 
      }, { status: 400 })
    }

    // Get emails from Microsoft Graph API
    console.log("📧 Calling Graph API: /me/messages")
    const response = await makeGraphRequest('/me/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,receivedDateTime,from,toRecipients,isRead,hasAttachments,importance,conversationId')

    console.log("📡 Graph API response status:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Graph API error response:", errorText)
      console.error("❌ Graph API status:", response.status, response.statusText)
      throw new Error(`Failed to fetch emails: ${response.statusText}`)
    }

    // Get raw response text for debugging
    const responseText = await response.text()
    console.log("📄 Raw Graph response length:", responseText.length, "characters")
    console.log("📄 Raw Graph response preview:", responseText.substring(0, 500) + "...")

    // Parse the response
    const data = JSON.parse(responseText)
    const emails = data.value || []
    console.log(`✅ Fetched ${emails.length} emails from Outlook`)
    console.log("📧 Email subjects found:", emails.map((email: any) => email.subject).slice(0, 5))

    // Process and save emails to database
    console.log("💾 Starting email processing loop...")
    const savedEmails = []
    const errors = []
    let processedCount = 0
    let skippedCount = 0

    for (const email of emails) {
      processedCount++
      console.log(`📧 Processing email ${processedCount}/${emails.length}:`, email.subject)
      
      try {
        // Check if email already exists
        console.log(`🔍 Checking if email exists: ${email.id}`)
        const { data: existingEmail } = await supabase
          .from('incoming_emails')
          .select('id')
          .eq('microsoft_id', email.id)
          .single()

        if (existingEmail) {
          // Email already exists, skip
          console.log(`⏭️ Email already exists, skipping: ${email.subject}`)
          skippedCount++
          continue
        }

        // Extract email addresses
        const fromEmail = email.from?.emailAddress?.address || ''
        const toEmails = email.toRecipients?.map((recipient: any) => recipient.emailAddress?.address).filter(Boolean) || []
        
        console.log(`📨 Email details - From: ${fromEmail}, To: ${toEmails.length} recipients`)
        console.log(`📅 Received: ${email.receivedDateTime}`)

        // Save email to database
        console.log(`💾 Inserting email into Supabase: ${email.subject}`)
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
          console.error('❌ Error saving email:', saveError)
          console.error('❌ Email ID:', email.id)
          console.error('❌ Error details:', saveError.message)
          errors.push({ emailId: email.id, error: saveError.message })
        } else {
          console.log(`✅ Successfully inserted email: ${email.subject}`)
          console.log(`✅ Inserted into Supabase with ID:`, savedEmail?.id)
          savedEmails.push(savedEmail)
        }

      } catch (error) {
        console.error('❌ Error processing email:', error)
        console.error('❌ Email subject:', email.subject)
        console.error('❌ Email ID:', email.id)
        errors.push({ emailId: email.id, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    // Final summary logging
    console.log("📊 Sync Summary:")
    console.log(`   - Total emails fetched: ${emails.length}`)
    console.log(`   - Emails processed: ${processedCount}`)
    console.log(`   - Emails skipped (already exist): ${skippedCount}`)
    console.log(`   - Emails successfully inserted: ${savedEmails.length}`)
    console.log(`   - Errors encountered: ${errors.length}`)

    const syncResponse = {
      success: true,
      message: `Synced ${savedEmails.length} new emails`,
      synced_count: savedEmails.length,
      total_processed: emails.length,
      skipped_count: skippedCount,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log("🎉 Sync completed successfully!")
    console.log("📤 Returning response:", syncResponse)

    return NextResponse.json(syncResponse)

  } catch (error) {
    console.error('❌ Sync inbox error:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      error: 'Failed to sync inbox',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  console.log("🔍 Checking Outlook connection status...")
  
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  // Get the current user's session
  console.log("📋 Getting Supabase user session for connection check...")
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    console.error("❌ Authentication failed for connection check:", sessionError?.message || "No session found")
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  console.log("✅ User authenticated for connection check:", session.user.email)

  try {
    // Check if user has connected Outlook
    console.log("🔗 Checking Outlook connection...")
    const hasConnection = await hasOutlookConnection()
    console.log("📡 Outlook connection status:", hasConnection)
    
    const response = {
      connected: hasConnection,
      message: hasConnection ? 'Outlook is connected' : 'Outlook is not connected',
      user_id: session.user.id,
      timestamp: new Date().toISOString()
    }
    
    console.log("📤 Connection check response:", response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Check connection error:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json({ 
      error: 'Failed to check connection',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 