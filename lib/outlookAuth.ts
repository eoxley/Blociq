// /lib/outlookAuth.ts

import { createClient } from '@/utils/supabase/server'
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

/**
 * Get Outlook tokens for the current user
 */
export async function getUserOutlookTokens(): Promise<OutlookToken | null> {
  const supabase = createClient(cookies())
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    throw new Error('User not authenticated')
  }

  const { data: tokens, error } = await supabase
    .from('outlook_tokens' as any)
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No tokens found for user
      return null
    }
    throw new Error(`Failed to fetch Outlook tokens: ${error.message}`)
  }

  return (tokens as unknown) as OutlookToken | null
}

/**
 * Save or update Outlook tokens for the current user
 */
export async function saveUserOutlookTokens(
  email: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const supabase = createClient(cookies())
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    throw new Error('User not authenticated')
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const { error } = await supabase
    .from('outlook_tokens' as any)
    .upsert({
      user_id: session.user.id,
      email,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt
    }, {
      onConflict: 'user_id'
    })

  if (error) {
    throw new Error(`Failed to save Outlook tokens: ${error.message}`)
  }
}

/**
 * Delete Outlook tokens for the current user
 */
export async function deleteUserOutlookTokens(): Promise<void> {
  const supabase = createClient(cookies())
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('outlook_tokens' as any)
    .delete()
    .eq('user_id', session.user.id)

  if (error) {
    throw new Error(`Failed to delete Outlook tokens: ${error.message}`)
  }
}

/**
 * Get a valid access token for the current user
 * Automatically refreshes if expired
 */
export async function getValidAccessToken(): Promise<string> {
  const tokens = await getUserOutlookTokens()
  if (!tokens) {
    throw new Error('No Outlook tokens found. Please connect your Outlook account.')
  }

  const now = new Date()
  const expiresAt = new Date(tokens.expires_at)

  // If token is expired or expires within 5 minutes, refresh it
  if (expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
    return await refreshAccessToken(tokens.refresh_token)
  }

  return tokens.access_token
}

/**
 * Refresh an expired access token
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Microsoft OAuth configuration missing')
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`)
  }

  const tokenData: TokenResponse = await response.json()

  // Get current user info to save tokens
  const supabase = createClient(cookies())
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('User session not found')
  }

  // Get the email from existing tokens
  const existingTokens = await getUserOutlookTokens()
  const email = existingTokens?.email

  if (!email) {
    throw new Error('No email found in existing tokens')
  }

  // Save the new tokens
  await saveUserOutlookTokens(
    email,
    tokenData.access_token,
    tokenData.refresh_token,
    tokenData.expires_in
  )

  return tokenData.access_token
}

/**
 * Check if the current user has connected Outlook
 */
export async function hasOutlookConnection(): Promise<boolean> {
  try {
    const tokens = await getUserOutlookTokens()
    return tokens !== null
  } catch (error) {
    return false
  }
}

/**
 * Get the connected Outlook email for the current user
 */
export async function getConnectedOutlookEmail(): Promise<string | null> {
  try {
    const tokens = await getUserOutlookTokens()
    return tokens?.email || null
  } catch (error) {
    return null
  }
}

/**
 * Create Microsoft Graph API headers with user's access token
 */
export async function createGraphHeaders(): Promise<HeadersInit> {
  const accessToken = await getValidAccessToken()
  
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Make a Microsoft Graph API request with automatic token management
 */
export async function makeGraphRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers = await createGraphHeaders()
  
  return fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
}
