'use client';

import { useState } from 'react';

export default function OutlookConnectPage() {
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const handleConnectOutlook = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      console.log('[Outlook Connect] Starting OAuth flow...');

      // Load environment variables with proper typing
      const clientId: string = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID!;
      const redirectUri: string = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI!;
      const scopes: string = 'Mail.Read offline_access openid';

      // Log both values to the console
      console.log("🔐 clientId:", clientId);
      console.log("🔁 redirectUri:", redirectUri);
      
      // Validate environment variables
      if (!clientId) {
        throw new Error('NEXT_PUBLIC_OUTLOOK_CLIENT_ID environment variable is not set. Please check your .env.local file.');
      }

      if (!redirectUri) {
        throw new Error('NEXT_PUBLIC_MICROSOFT_REDIRECT_URI environment variable is not set. Please check your .env.local file.');
      }

      // Build authorization URL using template string
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scopes}`;

      // Log the final authorization URL for debugging
      console.log('[Outlook Connect] Final authorization URL:', authUrl);
      console.log('[Outlook Connect] OAuth parameters confirmed:');
      console.log('  - client_id:', clientId);
      console.log('  - redirect_uri:', redirectUri);
      console.log('  - scope:', scopes);

      // Redirect to Microsoft's authorize endpoint
      window.location.href = authUrl;

    } catch (error: unknown) {
      console.error('[Outlook Connect] Error starting OAuth flow:', error);
      const errorMessage: string = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error: ${errorMessage}`);
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