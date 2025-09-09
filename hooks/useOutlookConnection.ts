'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';

interface OutlookConnectionStatus {
  isConnected: boolean;
  isChecking: boolean;
  error: string | null;
  userEmail: string | null;
  lastSync: string | null;
}

export function useOutlookConnection() {
  const { supabase } = useSupabase();
  const [status, setStatus] = useState<OutlookConnectionStatus>({
    isConnected: false,
    isChecking: true,
    error: null,
    userEmail: null,
    lastSync: null,
  });

  const checkConnection = useCallback(async () => {
    if (!supabase) return;

    try {
      setStatus(prev => ({ ...prev, isChecking: true, error: null }));

      // Check if user has valid Outlook tokens
      const response = await fetch('/api/outlook/status', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.connected) {
        setStatus({
          isConnected: true,
          isChecking: false,
          error: null,
          userEmail: data.email || null,
          lastSync: data.lastSync || null,
        });
      } else {
        setStatus({
          isConnected: false,
          isChecking: false,
          error: data.error || 'Not connected',
          userEmail: null,
          lastSync: null,
        });
      }
    } catch (error) {
      console.error('Error checking Outlook connection:', error);
      setStatus({
        isConnected: false,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Connection check failed',
        userEmail: null,
        lastSync: null,
      });
    }
  }, [supabase]);

  const initiateConnection = useCallback(async () => {
    if (!supabase) return;

    try {
      // Get current user session to ensure we're authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Please log in first');
      }

      console.log('🔗 Initiating Outlook connection for user:', session.user.email);

      // Create the OAuth URL with proper parameters
      const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID;
      const redirectUri = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI || process.env.NEXT_PUBLIC_OUTLOOK_REDIRECT_URI;
      const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'common';

      if (!clientId || !redirectUri) {
        throw new Error('OAuth configuration missing');
      }

      const scopes = [
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/Mail.ReadWrite',
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access'
      ].join(' ');

      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_mode=query&` +
        `state=${encodeURIComponent(JSON.stringify({ 
          userId: session.user.id, 
          returnUrl: '/inbox-overview',
          timestamp: Date.now()
        }))}`;

      console.log('🌐 Redirecting to OAuth URL');
      
      // Store the current page so we can return here after auth
      sessionStorage.setItem('outlook_return_url', '/inbox-overview');
      
      // Redirect to Microsoft OAuth
      window.location.href = authUrl;

    } catch (error) {
      console.error('Error initiating Outlook connection:', error);
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initiate connection'
      }));
    }
  }, [supabase]);

  const disconnect = useCallback(async () => {
    try {
      const response = await fetch('/api/outlook/disconnect', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setStatus({
          isConnected: false,
          isChecking: false,
          error: null,
          userEmail: null,
          lastSync: null,
        });
      }
    } catch (error) {
      console.error('Error disconnecting Outlook:', error);
    }
  }, []);

  // Auto-check connection status when hook is initialized
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    status,
    checkConnection,
    initiateConnection,
    disconnect,
    refresh: checkConnection,
  };
}