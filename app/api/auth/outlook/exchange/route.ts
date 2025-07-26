import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokensWithPkce } from '@/lib/outlook';
import { saveOutlookTokens } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    console.log('[Outlook Exchange] Starting token exchange...');
    
    const { code, code_verifier } = await req.json();
    
    console.log('[Outlook Exchange] Received code:', code ? 'present' : 'missing');
    console.log('[Outlook Exchange] Received code_verifier:', code_verifier ? 'present' : 'missing');
    
    if (!code) {
      console.error('[Outlook Exchange] Missing code parameter');
      return new NextResponse('Missing code parameter', { status: 400 });
    }
    
    if (!code_verifier) {
      console.error('[Outlook Exchange] Missing code_verifier parameter');
      return new NextResponse('Missing code_verifier parameter', { status: 400 });
    }
    
    // Exchange code for tokens using PKCE
    console.log('[Outlook Exchange] Calling exchangeCodeForTokensWithPkce...');
    const tokenData = await exchangeCodeForTokensWithPkce(code, code_verifier);
    console.log('[Outlook Exchange] Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });
    
    // Save tokens to Supabase
    console.log('[Outlook Exchange] Saving tokens to Supabase...');
    await saveOutlookTokens({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      user_email: 'testbloc@blociq.co.uk',
    });
    console.log('[Outlook Exchange] Tokens saved successfully');
    
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