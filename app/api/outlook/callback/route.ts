import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { saveUserOutlookTokens } from '@/lib/outlookAuth'

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  // Get the current user's session - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
  const sessionResult = await supabase.auth.getSession()
  const sessionData = sessionResult?.data || {}
  const session = sessionData.session || null
  const sessionError = sessionResult?.error || null
  
  if (sessionError || !session) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=oauth_failed', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?error=no_code', request.url))
  }

  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Microsoft OAuth configuration missing')
    }

    // Exchange code for tokens
    const tenantId = process.env.AZURE_TENANT_ID || 'common';
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      throw new Error('Failed to exchange code for tokens')
    }

    const tokenData = await tokenResponse.json()

    // Get user info from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get user info from Microsoft Graph')
    }

    const userData = await userResponse.json()
    const userEmail = userData.mail || userData.userPrincipalName

    if (!userEmail) {
      throw new Error('No email found in Microsoft user data')
    }

    // Clean up any existing tokens for this user before saving new ones
    console.log('🧹 Cleaning up existing tokens for user:', session.user.id)
    await supabase
      .from('outlook_tokens' as any)
      .delete()
      .eq('user_id', session.user.id)

    // Save tokens to the current user's account
    console.log('💾 Saving new tokens for user:', session.user.id, 'email:', userEmail)
    await saveUserOutlookTokens(
      userEmail,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    )

    console.log('✅ Outlook tokens saved successfully for:', userEmail)

    // Redirect to inbox with success message
    return NextResponse.redirect(new URL(`/inbox?success=outlook_connected&email=${encodeURIComponent(userEmail)}`, request.url))

  } catch (error) {
    console.error('Outlook OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=oauth_failed&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    )
  }
} 