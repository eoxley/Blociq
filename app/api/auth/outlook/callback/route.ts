import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokensWithPkce } from '@/lib/outlook';
import { saveOutlookTokens } from '@/lib/supabase';

// Store code verifiers temporarily (in production, use Redis or similar)
const codeVerifiers = new Map<string, string>();

export async function POST(req: NextRequest) {
  try {
    const { codeVerifier } = await req.json();
    const requestId = crypto.randomUUID();
    codeVerifiers.set(requestId, codeVerifier);
    
    console.log('[Outlook Callback] Stored code verifier with request ID:', requestId);
    return NextResponse.json({ requestId });
  } catch (error) {
    console.error('[Outlook Callback] Error storing code verifier:', error);
    return new NextResponse('Error storing code verifier', { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This contains the requestId

  console.log('[Outlook Callback] Callback URL:', req.url);
  console.log('[Outlook Callback] Query string:', searchParams.toString());
  console.log('[Outlook Callback] State parameter:', state);

  if (!code) {
    console.error('[Outlook Callback] Missing code parameter');
    return new NextResponse('Missing code', { status: 400 });
  }

  if (!state) {
    console.error('[Outlook Callback] Missing state parameter');
    return new NextResponse('Missing state', { status: 400 });
  }

  try {
    // Retrieve the code verifier using the state parameter (requestId)
    const verifier = codeVerifiers.get(state);
    if (!verifier) {
      console.error('[Outlook Callback] No verifier found for state:', state);
      return new NextResponse('Invalid state parameter', { status: 400 });
    }

    console.log('[Outlook Callback] Retrieved verifier for state:', state);
    
    const tokenData = await exchangeCodeForTokensWithPkce(code, verifier);
    console.log('[Outlook Callback] Token response:', tokenData);

    await saveOutlookTokens({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      user_email: 'testbloc@blociq.co.uk',
    });
    console.log('[Outlook Callback] Token saved successfully');

    // Clean up the stored verifier
    codeVerifiers.delete(state);
    console.log('[Outlook Callback] Cleaned up verifier for state:', state);

    return NextResponse.redirect(new URL('/', req.url));
  } catch (error) {
    console.error('[Outlook Callback] Error:', error);
    return new NextResponse('Callback error', { status: 500 });
  }
} 