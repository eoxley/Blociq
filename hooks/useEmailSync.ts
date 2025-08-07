"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// Set up your Supabase client (or import it from a shared utility)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type for the email objects
type Email = {
  id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  received_at: string;
  body_preview: string;
  body_full?: string;
  is_read: boolean;
  unread: boolean;
  flag_status?: string;
  categories?: string[];
  importance?: string;
  has_attachments?: boolean;
  outlook_id?: string;
  outlook_message_id?: string;
  sync_status?: string;
  last_sync_at?: string;
  [key: string]: any;
};

interface EmailSyncState {
  emails: Email[];
  newCount: number;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

export function useEmailSync(): [Email[], number, EmailSyncState] {
  const [state, setState] = useState<EmailSyncState>({
    emails: [],
    newCount: 0,
    isLoading: true,
    error: null,
    lastSync: null
  });
  
  const lastSyncTime = useRef<Date | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const fetchEmails = useCallback(async (isRetry = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("incoming_emails")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(100); // Limit to prevent performance issues

      if (error) {
        console.error("Error fetching emails:", error.message);
        throw new Error(error.message);
      }

      if (data) {
        const newEmails = data as Email[];
        const now = new Date();

        // Calculate new emails since last sync
        const recent = lastSyncTime.current 
          ? newEmails.filter((e: Email) => {
              const received = new Date(e.received_at);
              return received > lastSyncTime.current!;
            })
          : [];

        setState(prev => ({
          ...prev,
          emails: newEmails,
          newCount: recent.length,
          isLoading: false,
          lastSync: now,
          error: null
        }));

        lastSyncTime.current = now;
        retryCount.current = 0; // Reset retry count on success
      }
    } catch (error) {
      console.error("Error in fetchEmails:", error);
      
      if (isRetry && retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(`Retrying email fetch (${retryCount.current}/${maxRetries})...`);
        setTimeout(() => fetchEmails(true), 5000 * retryCount.current); // Exponential backoff
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch emails'
      }));
    }
  }, []);

  const manualSync = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call the sync API
      const response = await fetch('/api/sync-inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Sync failed');
      }

      const result = await response.json();
      console.log('✅ Manual sync completed:', result);

      // Refresh emails after sync
      await fetchEmails();
      
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Manual sync failed'
      }));
    }
  }, [fetchEmails]);

  useEffect(() => {
    // Initial fetch
    fetchEmails();

    // Set up real-time subscription
    const channel = supabase
      .channel('email-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incoming_emails'
        },
        (payload) => {
          console.log('📧 Real-time email update:', payload);
          // Refresh emails when changes occur
          fetchEmails();
        }
      )
      .subscribe();

    // Set up periodic refresh (every 30 seconds instead of 60)
    const interval = setInterval(() => {
      fetchEmails();
    }, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchEmails]);

  return [state.emails, state.newCount, state];
}

// Export manual sync function for use in components
export const useManualSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncEmails = useCallback(async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      
      const response = await fetch('/api/sync-inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Sync failed');
      }

      const result = await response.json();
      console.log('✅ Manual sync completed:', result);
      
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { syncEmails, isSyncing, syncError };
};
