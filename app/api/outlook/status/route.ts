import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user's session - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        connected: false, 
        error: 'Not authenticated',
        message: 'Please log in to connect Outlook'
      }, { status: 401 });
    }

    // Get the user's Outlook tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (tokenError) {
      console.error('Error fetching Outlook tokens:', tokenError);
      return NextResponse.json({
        connected: false,
        error: 'Database error',
        message: 'Failed to check Outlook tokens'
      }, { status: 500 });
    }

    if (!tokens) {
      return NextResponse.json({
        connected: false,
        error: 'No Outlook tokens found',
        message: 'Please connect your Outlook account first'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    const isExpired = expiresAt <= now;

    if (isExpired) {
      return NextResponse.json({
        connected: false,
        error: 'Token expired',
        message: 'Please reconnect your Outlook account',
        tokenExpired: true,
        expiresAt: tokens.expires_at
      });
    }

    // Test the token by making a simple API call
    try {
      const testResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!testResponse.ok) {
        return NextResponse.json({
          connected: false,
          error: 'Token invalid',
          message: 'Please reconnect your Outlook account',
          tokenInvalid: true
        });
      }

      const userData = await testResponse.json();

      return NextResponse.json({
        connected: true,
        email: tokens.email,
        userEmail: userData.mail || userData.userPrincipalName,
        expiresAt: tokens.expires_at,
        message: 'Outlook connected successfully'
      });

    } catch (apiError) {
      return NextResponse.json({
        connected: false,
        error: 'API test failed',
        message: 'Please reconnect your Outlook account',
        apiError: apiError instanceof Error ? apiError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Error checking Outlook status:', error);
    return NextResponse.json({
      connected: false,
      error: 'Internal server error',
      message: 'Failed to check Outlook connection status'
    }, { status: 500 });
  }
} 