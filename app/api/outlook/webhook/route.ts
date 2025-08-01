import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '@/lib/outlookAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Handle GET requests (for validation or health checks)
export async function GET(req: NextRequest) {
  console.log('🔍 Webhook GET request received')
  return new NextResponse('Webhook endpoint is active', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  })
}

// ✅ STEP 2: Add Outlook Webhook Subscription for True Real-Time Sync
// ✅ FIXED: Make user-specific instead of using most recent token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('📨 Outlook webhook received:', JSON.stringify(body, null, 2))

    // Handle subscription validation - Microsoft Graph sends this to verify the endpoint
    if (body.validationToken) {
      console.log('✅ Webhook validation token received:', body.validationToken)
      // Return the validation token as plain text with 200 status
      return new NextResponse(body.validationToken, {
        status: 200,
        headers: { 
          'Content-Type': 'text/plain',
          'Content-Length': body.validationToken.length.toString()
        }
      })
    }

    // Handle notifications
    if (body.value && Array.isArray(body.value)) {
      console.log(`📬 Processing ${body.value.length} notification(s)`)
      
      for (const notification of body.value) {
        await processEmailNotification(notification)
      }
    }

    // Always return 200 OK for notifications
    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    // Still return 200 OK even on error to prevent subscription deletion
    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

async function processEmailNotification(notification: any) {
  try {
    console.log('📧 Processing email notification:', notification.resourceData?.id)
    
    // Get access token for Microsoft Graph
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      console.error('❌ No valid access token available')
      return
    }

    // Fetch the email details from Microsoft Graph
    const emailId = notification.resourceData?.id
    if (!emailId) {
      console.error('❌ No email ID in notification')
      return
    }

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${emailId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('❌ Failed to fetch email details:', response.status)
      return
    }

    const emailData = await response.json()
    console.log('📨 Email data fetched:', emailData.subject)

    // ✅ FIXED: Determine which user this email belongs to
    // Get the user account info from the access token
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!userInfoResponse.ok) {
      console.error('❌ Failed to get user info:', userInfoResponse.status)
      return
    }

    const userInfo = await userInfoResponse.json()
    const userEmail = userInfo.mail || userInfo.userPrincipalName
    
    console.log('👤 Email belongs to user:', userEmail)

    // Find the specific user's token record
    const { data: userToken, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('user_id, email')
      .eq('user_email', userEmail)
      .single()

    if (tokenError || !userToken) {
      console.error('❌ No Outlook token found for user:', userEmail)
      return
    }

    console.log('✅ Found token for user:', userEmail, 'user_id:', userToken.user_id)

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('incoming_emails')
      .select('id')
      .eq('outlook_message_id', emailData.internetMessageId)
      .single()

    if (existingEmail) {
      console.log('✅ Email already exists, skipping:', emailData.subject)
      return
    }

    // Insert new email into database with correct user_id
    const { error: insertError } = await supabase
      .from('incoming_emails')
      .insert({
        outlook_message_id: emailData.internetMessageId,
        subject: emailData.subject || '(No Subject)',
        body_preview: emailData.bodyPreview || '',
        body_full: emailData.body?.content || '',
        from_email: emailData.from?.emailAddress?.address || '',
        from_name: emailData.from?.emailAddress?.name || '',
        received_at: emailData.receivedDateTime,
        is_handled: false,
        is_read: false,
        user_id: userToken.user_id, // ✅ Now using correct user_id
        folder: 'inbox',
        sync_status: 'webhook_synced',
        last_sync_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('❌ Failed to insert email:', insertError)
    } else {
      console.log('✅ Email inserted via webhook for user:', userEmail, 'subject:', emailData.subject)
    }

  } catch (error) {
    console.error('❌ Error processing email notification:', error)
  }
}

// Helper function to test webhook URL accessibility
async function testWebhookUrl(webhookUrl: string): Promise<boolean> {
  try {
    console.log('🧪 Testing webhook URL accessibility:', webhookUrl)
    
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (response.ok) {
      console.log('✅ Webhook URL is accessible')
      return true
    } else {
      console.error('❌ Webhook URL not accessible:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error('❌ Error testing webhook URL:', error)
    return false
  }
}

// Helper function to create webhook subscription
export async function createWebhookSubscription() {
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      throw new Error('No valid access token')
    }

    // Get the correct webhook URL - use localhost for development
    let webhookUrl = 'https://blociq.co.uk/api/outlook/webhook' // Default production URL
    
    if (process.env.NODE_ENV === 'development') {
      webhookUrl = 'http://localhost:3000/api/outlook/webhook'
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/outlook/webhook`
    }

    console.log('🔗 Using webhook URL:', webhookUrl)
    console.log('🌍 Environment:', process.env.NODE_ENV)
    console.log('🏠 Site URL:', process.env.NEXT_PUBLIC_SITE_URL)

    // Test webhook URL accessibility
    const isAccessible = await testWebhookUrl(webhookUrl)
    if (!isAccessible) {
      throw new Error(`Webhook URL is not accessible: ${webhookUrl}`)
    }

    const subscriptionData = {
      changeType: 'created',
      notificationUrl: webhookUrl,
      resource: '/me/mailFolders(\'Inbox\')/messages',
      expirationDateTime: new Date(Date.now() + 4230 * 1000).toISOString(), // 70.5 minutes
      clientState: 'blociq-webhook-subscription'
    }

    console.log('📋 Creating subscription with data:', JSON.stringify(subscriptionData, null, 2))

    const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to create webhook subscription:', errorText)
      console.error('❌ Response status:', response.status, response.statusText)
      console.error('❌ Webhook URL used:', webhookUrl)
      throw new Error(`Failed to create subscription: ${errorText}`)
    }

    const subscription = await response.json()
    console.log('✅ Webhook subscription created:', subscription.id)
    return subscription

  } catch (error) {
    console.error('❌ Error creating webhook subscription:', error)
    throw error
  }
}

// Helper function to refresh webhook subscription
export async function refreshWebhookSubscription(subscriptionId: string) {
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      throw new Error('No valid access token')
    }

    const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expirationDateTime: new Date(Date.now() + 4230 * 1000).toISOString()
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Failed to refresh webhook subscription:', error)
      throw new Error(`Failed to refresh subscription: ${error}`)
    }

    console.log('✅ Webhook subscription refreshed:', subscriptionId)

  } catch (error) {
    console.error('❌ Error refreshing webhook subscription:', error)
    throw error
  }
} 