import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  // Fix 406 by setting proper headers
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  try {
    const supabase = createClient(cookies());
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        connected: false, 
        error: 'Not authenticated',
        message: 'Please log in to check Outlook connection'
      }, { status: 401, headers });
    }

    // Get the user's Outlook tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('email, expires_at, created_at, updated_at')
      .eq('user_id', session.user.id)
      .single();

    if (tokenError) {
      // Handle specific error cases
      if (tokenError.code === 'PGRST116') {
        // No tokens found - this is expected if user hasn't connected Outlook
        return NextResponse.json({
          connected: false,
          error: 'No Outlook tokens found',
          message: 'Please connect your Outlook account first',
          needsConnection: true
        }, { headers });
      }
      
      // Other database errors
      return NextResponse.json({
        connected: false,
        error: 'Database error',
        message: 'Error checking Outlook connection',
        details: tokenError.message
      }, { status: 500, headers });
    }

    if (!tokens) {
      return NextResponse.json({
        connected: false,
        error: 'No tokens found',
        message: 'Please connect your Outlook account first',
        needsConnection: true
      }, { headers });
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
        expiresAt: tokens.expires_at,
        needsReconnection: true
      }, { headers });
    }

    // Token exists and is valid
    return NextResponse.json({
      connected: true,
      email: tokens.email,
      expiresAt: tokens.expires_at,
      connectedAt: tokens.created_at,
      lastUpdated: tokens.updated_at,
      message: 'Outlook connected successfully'
    }, { headers });

  } catch (error) {
    console.error('Outlook tokens API error:', error);
    return NextResponse.json({
      connected: false,
      error: 'Server error',
      message: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500, headers });
  }
}

export async function POST(req: NextRequest) {
  const headers = {
    'Content-Type': 'application/json',
  };

  return NextResponse.json({
    error: 'Method not allowed',
    message: 'Use GET to check Outlook token status',
    allowed: ['GET']
  }, { status: 405, headers });
}

// Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
