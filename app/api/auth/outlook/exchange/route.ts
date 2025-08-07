import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/outlook';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    console.log('[Outlook Exchange] Starting token exchange...');
    
    const { code }: { code: string } = await req.json();
    
    console.log('[Outlook Exchange] Received code:', code ? 'present' : 'missing');
    
    if (!code) {
      console.error('[Outlook Exchange] Missing code parameter');
      return new NextResponse('Missing code parameter', { status: 400 });
    }
    
    // Get the authenticated user
    const supabase = createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[Outlook Exchange] No authenticated session:', sessionError);
      return new NextResponse('Authentication required', { status: 401 });
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    console.log('[Outlook Exchange] Authenticated user:', { userId, userEmail });
    
    // Exchange code for tokens
    console.log('[Outlook Exchange] Calling exchangeCodeForTokens...');
    const tokenData = await exchangeCodeForTokens(code);
    console.log('[Outlook Exchange] Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });

    const upsertData = {
      user_id: userId,
      email: userEmail,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    };
    console.log('[Outlook Exchange] Upserting token with:', upsertData);

    const { error: upsertError } = await supabase
      .from('outlook_tokens')
      .upsert(upsertData, { onConflict: 'user_id' });
    if (upsertError) {
      console.error('[Outlook Exchange] Error upserting token:', upsertError);
      throw upsertError;
    }
    console.log('[Outlook Exchange] Token upserted successfully for', userEmail);

    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Outlook account connected successfully' 
    });
    
  } catch (error) {
    console.error('[Outlook Exchange] Error during token exchange:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 