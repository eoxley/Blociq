import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

interface OutlookToken {
  id: string
  user_id: string
  email: string
  access_token: string
  refresh_token: string
  expires_at: string
  created_at: string
  updated_at: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface GraphMessage {
  id: string
  subject: string
  bodyPreview: string
  internetMessageId: string
  from: {
    emailAddress: {
      address: string
      name: string
    }
  }
  receivedDateTime: string
  isRead: boolean
  hasAttachments: boolean
  importance: string
  conversationId: string
}

export async function POST(req: NextRequest) {
  console.log("🚀 Starting secure inbox sync process...")
  
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  try {
    // ✅ 1. Get Supabase Session and User ID
    console.log("📋 Getting Supabase user session...")
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()
    
    if (sessionError || !user) {
      console.error("❌ Authentication failed:", sessionError?.message || "No user found")
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = user.id
    console.log("✅ Supabase user ID:", userId)
    console.log("✅ User email:", user.email)

    // 🔐 2. Lookup Access Token
    console.log("🔍 Looking up Outlook tokens for user...")
    const { data: token, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (tokenError || !token) {
      console.error("❌ No Outlook tokens found:", tokenError?.message || "No tokens")
      return NextResponse.json({ 
        error: 'Outlook not connected', 
        message: 'Please connect your Outlook account first' 
      }, { status: 400 })
    }

    console.log("✅ Found Outlook tokens for:", token.email)
    console.log("📅 Token expires at:", token.expires_at)

    // ⏳ 3. Refresh Token If Expired
    let accessToken = token.access_token
    let refreshedToken = false
    
    const now = new Date()
    const expiresAt = new Date(token.expires_at)
    
    if (expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
      console.log("🔄 Token expired or expiring soon, refreshing...")
      
      const clientId = process.env.MICROSOFT_CLIENT_ID
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI
      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'

      if (!clientId || !clientSecret || !redirectUri) {
        console.error("❌ Microsoft OAuth configuration missing")
        return NextResponse.json({ error: 'OAuth configuration missing' }, { status: 500 })
      }

      const refreshResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: token.refresh_token,
          redirect_uri: redirectUri,
        }),
      })

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text()
        console.error("❌ Token refresh failed:", refreshResponse.status, errorText)
        return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 })
      }

      const tokenData: TokenResponse = await refreshResponse.json()
      console.log("✅ Token refreshed successfully")
      
      // Store the new token + expiry back to outlook_tokens
      const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      
      const { error: updateError } = await supabase
        .from("outlook_tokens")
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)

      if (updateError) {
        console.error("❌ Failed to update tokens:", updateError)
        return NextResponse.json({ error: 'Failed to update tokens' }, { status: 500 })
      }

      accessToken = tokenData.access_token
      refreshedToken = true
      console.log("✅ Tokens updated in database")
    }

    // 📥 4. Fetch Outlook Emails
    console.log("📧 Fetching emails from Microsoft Graph...")
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=20&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,internetMessageId,from,receivedDateTime,isRead,hasAttachments,importance,conversationId', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    console.log("📡 Graph API response status:", graphResponse.status, graphResponse.statusText)

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text()
      console.error("❌ Graph API error response:", errorText)
      console.error("❌ Graph API status:", graphResponse.status, graphResponse.statusText)
      return NextResponse.json({ error: `Graph API error: ${graphResponse.statusText}` }, { status: 500 })
    }

    const graphData = await graphResponse.json()
    const messages: GraphMessage[] = graphData.value || []
    
    console.log(`✅ Fetched ${messages.length} emails from Outlook`)
    console.log("📧 Email subjects found:", messages.map(email => email.subject).slice(0, 5))

    // 🗃 5. Insert Into incoming_emails
    console.log("💾 Processing emails for database insertion...")
    let insertedCount = 0
    let skippedCount = 0
    const errors: any[] = []

    for (const message of messages) {
      try {
        // Check if email already exists via outlook_id
        const { data: existingEmail } = await supabase
          .from('incoming_emails')
          .select('id')
          .eq('outlook_id', message.internetMessageId)
          .single()

        if (existingEmail) {
          console.log(`⏭️ Email already exists, skipping: ${message.subject}`)
          skippedCount++
          continue
        }

        // Insert new email
        const { data: savedEmail, error: insertError } = await supabase
          .from('incoming_emails')
          .insert({
            subject: message.subject || 'No Subject',
            body_preview: message.bodyPreview || '',
            outlook_id: message.internetMessageId,
            received_at: message.receivedDateTime,
            from_email: message.from.emailAddress.address,
            from_name: message.from.emailAddress.name,
            is_read: message.isRead || false,
            has_attachments: message.hasAttachments || false,
            importance: message.importance || 'normal',
            conversation_id: message.conversationId,
            user_id: userId,
            handled: false
          })
          .select()
          .single()

        if (insertError) {
          console.error('❌ Error inserting email:', insertError)
          errors.push({ 
            emailId: message.internetMessageId, 
            error: insertError.message,
            subject: message.subject 
          })
        } else {
          console.log(`✅ Successfully inserted email: ${message.subject}`)
          insertedCount++
        }

      } catch (error) {
        console.error('❌ Error processing email:', error)
        errors.push({ 
          emailId: message.internetMessageId, 
          error: error instanceof Error ? error.message : 'Unknown error',
          subject: message.subject 
        })
      }
    }

    // 🧪 6. Return a Clear Response
    const response = {
      success: true,
      fetched: messages.length,
      inserted: insertedCount,
      skipped: skippedCount,
      refreshedToken,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${insertedCount} new emails from Outlook`,
      timestamp: new Date().toISOString()
    }

    console.log("📊 Sync Summary:")
    console.log(`   - Total emails fetched: ${messages.length}`)
    console.log(`   - Emails inserted: ${insertedCount}`)
    console.log(`   - Emails skipped: ${skippedCount}`)
    console.log(`   - Token refreshed: ${refreshedToken}`)
    console.log(`   - Errors: ${errors.length}`)

    console.log("🎉 Sync completed successfully!")
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Sync inbox error:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to sync inbox',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  console.log("🔍 Checking Outlook connection status...")
  
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  try {
    // Get the current user's session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()
    
    if (sessionError || !user) {
      console.error("❌ Authentication failed:", sessionError?.message || "No user found")
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user has Outlook tokens
    const { data: token, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("email, expires_at")
      .eq("user_id", user.id)
      .single()

    const hasConnection = !tokenError && token !== null
    const isExpired = hasConnection ? new Date(token.expires_at) <= new Date() : false
    
    const response = {
      connected: hasConnection,
      email: hasConnection ? token.email : null,
      tokenExpired: isExpired,
      message: hasConnection 
        ? (isExpired ? 'Outlook connected but token expired' : 'Outlook is connected')
        : 'Outlook is not connected',
      user_id: user.id,
      timestamp: new Date().toISOString()
    }
    
    console.log("📤 Connection check response:", response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Check connection error:', error)
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to check connection',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 