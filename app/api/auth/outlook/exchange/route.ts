import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/outlook';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    console.log('[Outlook Exchange] Starting token exchange...');
    
    const { code }: { code: string } = await req.json();
    
    console.log('[Outlook Exchange] Received code:', code ? 'present' : 'missing');
    
    if (!code) {
      console.error('[Outlook Exchange] Missing code parameter');
      return new NextResponse('Missing code parameter', { status: 400 });
    }
    
    // Exchange code for tokens
    console.log('[Outlook Exchange] Calling exchangeCodeForTokens...');
    const tokenData = await exchangeCodeForTokens(code);
    console.log('[Outlook Exchange] Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });

    const upsertData = {
      user_id: 'ee16d137-2e05-4032-a852-15478ec60c3c',
      email: 'testbloc@blociq.co.uk',
      user_email: 'testbloc@blociq.co.uk',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    };
    console.log('[Outlook Exchange] Upserting token with:', upsertData);

    const { error: upsertError } = await supabase
      .from('outlook_tokens')
      .upsert(upsertData, { onConflict: 'user_email' });
    if (upsertError) {
      console.error('[Outlook Exchange] Error upserting token:', upsertError);
      throw upsertError;
    }
    console.log('[Outlook Exchange] Token upserted successfully for', upsertData.user_email);

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