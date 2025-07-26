'use client';

import { useState } from 'react';

// Generate a random string for PKCE code verifier
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate code challenge from verifier using SHA256
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export default function OutlookConnectPage() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectOutlook = async () => {
    try {
      setIsConnecting(true);
      console.log('[Outlook Connect] Starting OAuth flow...');

      // Generate PKCE code verifier
      const codeVerifier = generateCodeVerifier();
      console.log('[Outlook Connect] Generated code verifier:', codeVerifier);

      // Generate code challenge
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      console.log('[Outlook Connect] Generated code challenge:', codeChallenge);

      // Store code verifier in localStorage as backup
      localStorage.setItem('outlook_pkce_verifier', codeVerifier);
      console.log('[Outlook Connect] Stored code verifier in localStorage');

      // Send code verifier to server and get request ID
      const response = await fetch('/api/auth/outlook/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeVerifier }),
      });

      if (!response.ok) {
        throw new Error('Failed to store code verifier on server');
      }

      const { requestId } = await response.json();
      console.log('[Outlook Connect] Received request ID:', requestId);

      // Build authorization URL
      const clientId = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID;
      const redirectUri = 'https://www.blociq.co.uk/api/auth/outlook/callback';
      
      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', clientId!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('scope', 'Mail.Read offline_access openid');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('state', requestId); // Pass requestId in state

      console.log('[Outlook Connect] Redirecting to Microsoft authorize endpoint:', authUrl.toString());

      // Redirect to Microsoft's authorize endpoint
      window.location.href = authUrl.toString();

    } catch (error) {
      console.error('[Outlook Connect] Error starting OAuth flow:', error);
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connect Outlook Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your Outlook account to sync emails and calendar events
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <button
            onClick={handleConnectOutlook}
            disabled={isConnecting}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Connecting...' : 'Connect Outlook'}
          </button>
        </div>
      </div>
    </div>
  );
} 