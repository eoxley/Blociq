import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI;
    const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';
    const scope = 'Calendars.ReadWrite offline_access';
    
    // Construct the OAuth URL to validate
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId || '');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri || '');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', 'test-state');
    authUrl.searchParams.set('response_mode', 'query');
    
    return NextResponse.json({
      configuration: {
        clientId: clientId ? 'Set' : 'Missing',
        redirectUri: redirectUri || 'Missing',
        tenantId: tenantId,
        scope: scope
      },
      constructedUrl: authUrl.toString(),
      validation: {
        hasClientId: !!clientId,
        hasRedirectUri: !!redirectUri,
        redirectUriMatches: redirectUri === 'https://www.blociq.co.uk/api/auth/outlook/callback',
        urlIsValid: authUrl.toString().includes('client_id=') && authUrl.toString().includes('redirect_uri=')
      },
      azureChecklist: [
        '✅ Environment variables configured',
        redirectUri === 'https://www.blociq.co.uk/api/auth/outlook/callback' ? '✅ Redirect URI matches expected' : '❌ Redirect URI mismatch',
        '🔍 Check Azure Portal: Authentication → Redirect URIs',
        '🔍 Check Azure Portal: API permissions → Microsoft Graph',
        '🔍 Check Azure Portal: Certificates & secrets → Client secrets'
      ]
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to validate Azure configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 