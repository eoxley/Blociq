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
  // Check if we're in a server-side context
  if (typeof window === 'undefined') {
    // Server-side: use service role key for direct database access
    const supabase = createClient()
    
    // For server-side, we need to get the user ID from the request context
    // This function should be called with a user ID parameter in server contexts
    throw new Error('getUserOutlookTokens() called in server context without user ID. Use getUserOutlookTokensForUser(userId) instead.')
  }
  
  // Client-side: use cookies for authentication
  const supabase = await createClient()
  
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
 * Get Outlook tokens for a specific user (server-side)
 */
export async function getUserOutlookTokensForUser(userId: string): Promise<OutlookToken | null> {
  const supabase = createClient()

  const { data: tokens, error } = await supabase
    .from('outlook_tokens' as any)
    .select('*')
    .eq('user_id', userId)
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
  const supabase = await createClient()
  
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
  const supabase = await createClient()
  
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
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string> {
  try {
    console.log('[outlookAuth] Getting valid access token')
    const tokens = await getUserOutlookTokens()
    
    if (!tokens) {
      console.error('[outlookAuth] No Outlook tokens found for user')
      throw new Error('No Outlook connection found. Please connect your Outlook account first.')
    }

    const now = new Date()
    const expiresAt = new Date(tokens.expires_at)
    
    console.log('[outlookAuth] Token expires at:', expiresAt.toISOString(), 'Current time:', now.toISOString())
    
    // Check if token is expired (with 5 minute buffer)
    if (now >= expiresAt) {
      console.log('[outlookAuth] Token expired, refreshing...')
      return await refreshAccessToken(tokens.refresh_token)
    }

    console.log('[outlookAuth] Token is still valid, no refresh needed')
    return tokens.access_token
  } catch (error) {
    console.error('[outlookAuth] Error getting valid access token:', error)
    throw error
  }
}

/**
 * Get a valid access token for a specific user (server-side)
 */
export async function getValidAccessTokenForUser(userId: string): Promise<string> {
  try {
    console.log('[outlookAuth] Getting valid access token for user:', userId)
    const tokens = await getUserOutlookTokensForUser(userId)
    
    if (!tokens) {
      console.error('[outlookAuth] No Outlook tokens found for user:', userId)
      throw new Error('No Outlook connection found. Please connect your Outlook account first.')
    }

    const now = new Date()
    const expiresAt = new Date(tokens.expires_at)
    
    console.log('[outlookAuth] Token expires at:', expiresAt.toISOString(), 'Current time:', now.toISOString())
    
    // Check if token is expired (with 5 minute buffer)
    if (now >= expiresAt) {
      console.log('[outlookAuth] Token expired, refreshing...')
      return await refreshAccessTokenForUser(userId, tokens.refresh_token)
    }

    console.log('[outlookAuth] Token is still valid, no refresh needed')
    return tokens.access_token
  } catch (error) {
    console.error('[outlookAuth] Error getting valid access token for user:', userId, error)
    throw error
  }
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

  const tenantId = process.env.AZURE_TENANT_ID || 'common';
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
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
  const supabase = await createClient()
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
 * Refresh an expired access token for a specific user (server-side)
 */
async function refreshAccessTokenForUser(userId: string, refreshToken: string): Promise<string> {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Microsoft OAuth configuration missing')
  }

  const tenantId = process.env.AZURE_TENANT_ID || 'common';
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
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

  // Get the email from existing tokens
  const existingTokens = await getUserOutlookTokensForUser(userId)
  const email = existingTokens?.email

  if (!email) {
    throw new Error('No email found in existing tokens')
  }

  // Save the new tokens using service role
  const supabase = createClient()

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  const { error } = await supabase
    .from('outlook_tokens' as any)
    .upsert({
      user_id: userId,
      email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
    }, {
      onConflict: 'user_id'
    })

  if (error) {
    throw new Error(`Failed to save refreshed tokens: ${error.message}`)
  }

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
 * Create Microsoft Graph API headers for a specific user (server-side)
 */
export async function createGraphHeadersForUser(userId: string): Promise<HeadersInit> {
  const accessToken = await getValidAccessTokenForUser(userId)
  
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Make a Microsoft Graph API request with automatic token management
 */
export async function makeGraphRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  try {
    console.log('[outlookAuth] Creating Graph headers for endpoint:', endpoint)
    const headers = await createGraphHeaders()
    
    const url = `https://graph.microsoft.com/v1.0${endpoint}`
    console.log('[outlookAuth] Making request to:', url)
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })
    
    console.log('[outlookAuth] Response status:', response.status, 'for endpoint:', endpoint)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[outlookAuth] Graph API error:', response.status, errorText)
    }
    
    return response
  } catch (error) {
    console.error('[outlookAuth] Error in makeGraphRequest:', error)
    throw error
  }
}
