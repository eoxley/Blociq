import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const outlookEmail = 'testbloc@blociq.co.uk'

  try {
    console.log('🔍 Checking Outlook integration for:', outlookEmail)

    // 1. Check if token exists in Supabase
    const { data: tokenRow, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('email', outlookEmail)
      .single()

    if (tokenError || !tokenRow) {
      console.log('❌ No Outlook token found:', tokenError?.message)
      return NextResponse.json({
        tokenStatus: 'missing',
        emailAccess: false,
        recentSubject: null,
        syncReady: false,
        error: 'No Outlook token found. Please connect Outlook account.',
        details: tokenError?.message || 'Token not found'
      })
    }

    console.log('✅ Token found, checking expiration...')

    // 2. Check if token is expired
    const now = new Date()
    const expiresAt = new Date(tokenRow.expires_at)
    const isExpired = now >= expiresAt

    if (isExpired) {
      console.log('❌ Token is expired')
      return NextResponse.json({
        tokenStatus: 'expired',
        emailAccess: false,
        recentSubject: null,
        syncReady: false,
        error: 'Outlook token is expired. Please reconnect Outlook account.',
        details: `Expired at ${expiresAt.toISOString()}`
      })
    }

    console.log('✅ Token is valid, testing Microsoft Graph API...')

    // 3. Test token with Microsoft Graph API
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=1', {
      headers: {
        Authorization: `Bearer ${tokenRow.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text()
      console.error('❌ Graph API error:', graphResponse.status, errorText)
      
      return NextResponse.json({
        tokenStatus: 'invalid',
        emailAccess: false,
        recentSubject: null,
        syncReady: false,
        error: 'Outlook token is invalid or lacks required permissions.',
        details: `Graph API returned ${graphResponse.status}: ${errorText}`
      })
    }

    const graphData = await graphResponse.json()
    const messages = graphData.value || []
    
    if (messages.length === 0) {
      console.log('⚠️ No emails found in Outlook')
      return NextResponse.json({
        tokenStatus: 'valid',
        emailAccess: true,
        recentSubject: null,
        syncReady: true,
        message: 'Token is valid but no emails found in Outlook inbox.'
      })
    }

    const recentEmail = messages[0]
    console.log('✅ Graph API test successful, found email:', recentEmail.subject)

    return NextResponse.json({
      tokenStatus: 'valid',
      emailAccess: true,
      recentSubject: recentEmail.subject,
      syncReady: true,
      message: 'Outlook integration is healthy and ready for sync.',
      emailCount: messages.length
    })

  } catch (error) {
    console.error('❌ Error checking Outlook integration:', error)
    
    return NextResponse.json({
      tokenStatus: 'error',
      emailAccess: false,
      recentSubject: null,
      syncReady: false,
      error: 'Failed to check Outlook integration.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}