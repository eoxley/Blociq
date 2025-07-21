import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        user: null 
      }, { status: 401 });
    }

    // Check if user has Outlook tokens
    const { data: token, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (tokenError || !token) {
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email
        },
        outlookConnected: false,
        message: 'No Outlook tokens found. Please connect your Outlook account first.',
        token: null
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    const isExpired = expiresAt <= now;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      outlookConnected: true,
      outlookEmail: token.email,
      tokenExpired: isExpired,
      expiresAt: token.expires_at,
      message: isExpired ? 'Outlook connected but token is expired' : 'Outlook connected and token is valid'
    });

  } catch (error) {
    console.error('Error checking Outlook connection:', error);
    return NextResponse.json({ 
      error: 'Failed to check Outlook connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 