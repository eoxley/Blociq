import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/outlook';
import { saveOutlookTokens } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const code = searchParams.get('code');

  console.log('[Outlook Callback] Callback URL:', req.url);
  console.log('[Outlook Callback] Query string:', searchParams.toString());

  if (!code) {
    console.error('[Outlook Callback] Missing code parameter');
    return new NextResponse('Missing code', { status: 400 });
  }

  try {
    const tokenData = await exchangeCodeForTokens(code);
    console.log('[Outlook Callback] Token response:', tokenData);

    await saveOutlookTokens({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      user_email: 'testbloc@blociq.co.uk',
    });
    console.log('[Outlook Callback] Token saved successfully');
    return NextResponse.redirect(new URL('/', req.url));
  } catch (error) {
    console.error('[Outlook Callback] Error:', error);
    return new NextResponse('Callback error', { status: 500 });
  }
} 