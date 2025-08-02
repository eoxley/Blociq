import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debug: Checking Outlook connection...')
    
    // Get current user session
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = user.id
    const userEmail = user.email
    console.log('👤 Checking Outlook for user:', userId, 'Email:', userEmail)
    
    // Check if user has Outlook token
    const { data: token, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", userId)
      .single()
    
    if (tokenError) {
      console.error('❌ Error fetching token:', tokenError)
      return NextResponse.json({
        success: false,
        error: 'No Outlook token found',
        details: tokenError.message,
        user: {
          id: userId,
          email: userEmail
        }
      })
    }
    
    if (!token) {
      console.error('❌ No Outlook token found for user:', userId)
      return NextResponse.json({
        success: false,
        error: 'Outlook not connected',
        message: 'Please connect your Outlook account first',
        user: {
          id: userId,
          email: userEmail
        }
      })
    }
    
    console.log('✅ Found Outlook token for user:', token.email)
    
    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(token.expires_at)
    const isExpired = expiresAt <= now
    
    console.log('🔍 Token status:', {
      email: token.email,
      isExpired,
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString()
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userEmail
      },
      outlook: {
        connected: true,
        email: token.email,
        isExpired,
        expiresAt: expiresAt.toISOString(),
        hasAccessToken: !!token.access_token,
        hasRefreshToken: !!token.refresh_token
      },
      debug: {
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 