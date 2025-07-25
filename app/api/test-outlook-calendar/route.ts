import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        status: 'unauthenticated'
      }, { status: 401 });
    }

    // Check environment variables
    const envCheck = {
      OUTLOOK_CLIENT_ID: !!process.env.OUTLOOK_CLIENT_ID,
      OUTLOOK_CLIENT_SECRET: !!process.env.OUTLOOK_CLIENT_SECRET,
      OUTLOOK_REDIRECT_URI: !!process.env.OUTLOOK_REDIRECT_URI,
      NEXT_PUBLIC_MICROSOFT_CLIENT_ID: !!process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
      NEXT_PUBLIC_MICROSOFT_REDIRECT_URI: !!process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI
    };

    // Get the user's Outlook tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (tokenError || !tokens) {
      return NextResponse.json({ 
        status: 'not_connected',
        message: 'Outlook not connected',
        user: {
          id: session.user.id,
          email: session.user.email
        },
        environment: envCheck,
        nextSteps: [
          '1. Ensure all Microsoft OAuth environment variables are set',
          '2. Click "Connect Outlook" on the homepage',
          '3. Complete the Microsoft OAuth flow',
          '4. Verify tokens are stored in the database'
        ]
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    const isExpired = expiresAt <= now;

    if (isExpired) {
      return NextResponse.json({ 
        status: 'token_expired',
        message: 'Outlook token expired',
        user: {
          id: session.user.id,
          email: session.user.email
        },
        outlookEmail: tokens.email,
        expiresAt: tokens.expires_at,
        environment: envCheck,
        nextSteps: [
          '1. Reconnect your Outlook account',
          '2. The system will refresh your tokens automatically'
        ]
      });
    }

    // Test Microsoft Graph API call
    try {
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/calendar/events?$top=1',
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json({ 
          status: 'api_error',
          message: 'Microsoft Graph API error',
          user: {
            id: session.user.id,
            email: session.user.email
          },
          outlookEmail: tokens.email,
          expiresAt: tokens.expires_at,
          environment: envCheck,
          apiError: errorData,
          nextSteps: [
            '1. Check if the access token is valid',
            '2. Verify Microsoft Graph API permissions',
            '3. Try reconnecting your Outlook account'
          ]
        });
      }

      const data = await response.json();
      const eventCount = data.value?.length || 0;

      return NextResponse.json({ 
        status: 'connected',
        message: 'Outlook connected and working',
        user: {
          id: session.user.id,
          email: session.user.email
        },
        outlookEmail: tokens.email,
        expiresAt: tokens.expires_at,
        environment: envCheck,
        apiTest: {
          success: true,
          eventCount: eventCount,
          hasEvents: eventCount > 0
        },
        nextSteps: [
          '1. Outlook integration is working correctly',
          '2. You can now view your calendar events on the homepage',
          '3. Use the "Sync" button to refresh your events'
        ]
      });

    } catch (apiError) {
      return NextResponse.json({ 
        status: 'api_error',
        message: 'Failed to test Microsoft Graph API',
        user: {
          id: session.user.id,
          email: session.user.email
        },
        outlookEmail: tokens.email,
        expiresAt: tokens.expires_at,
        environment: envCheck,
        apiError: apiError instanceof Error ? apiError.message : 'Unknown error',
        nextSteps: [
          '1. Check your internet connection',
          '2. Verify Microsoft Graph API is accessible',
          '3. Try reconnecting your Outlook account'
        ]
      });
    }

  } catch (error) {
    console.error('Error testing Outlook calendar integration:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 