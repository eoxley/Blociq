"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { useSession } from '@/lib/auth';
import { toast } from 'sonner';

interface Email {
  id: string;
  outlook_id: string;
  outlook_message_id: string | null;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  body_preview: string | null;
  body_full: string | null;
  received_at: string | null;
  unread: boolean | null;
  is_read: boolean | null;
  handled: boolean | null;
  is_handled: boolean | null;
  pinned: boolean | null;
  flag_status: string | null;
  categories: string[] | null;
  importance: string | null;
  has_attachments: boolean | null;
  to_email: string[] | null;
  cc_email: string[] | null;
  building_id: number | null;
  unit_id: number | null;
  leaseholder_id: string | null;
  user_id: string | null;
  ai_tag?: string | null;
  triage_category?: string | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  sync_status: string | null;
  last_sync_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface InboxInfo {
  totalCount: number;
  unreadCount: number;
}

interface UseOutlookInboxReturn {
  emails: Email[];
  selectedEmail: Email | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  isRealTimeEnabled: boolean;
  newEmailCount: number;
  inboxInfo: InboxInfo | null;
  selectEmail: (email: Email | null) => void;
  manualSync: () => Promise<void>;
  markAsRead: (emailId: string) => Promise<void>;
  markAsHandled: (emailId: string) => Promise<void>;
  flagEmail: (emailId: string, flagged: boolean) => Promise<void>;
  refreshEmails: () => Promise<void>;
}

export function useOutlookInbox(): UseOutlookInboxReturn {
  const { supabase } = useSupabase();
  const { user, loading: sessionLoading } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [newEmailCount, setNewEmailCount] = useState(0);
  const [inboxInfo, setInboxInfo] = useState<InboxInfo | null>(null);
  
  const lastSyncTime = useRef<Date | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch emails from Microsoft Graph API
  const fetchEmails = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const response = await fetch('/api/fetch-outlook-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.code === 'OUTLOOK_NOT_CONNECTED') {
          setError('Outlook not connected');
          toast.error('Please connect your Outlook account first');
        } else if (errorData.code === 'TOKEN_REFRESH_FAILED' || errorData.code === 'AUTH_FAILED') {
          setError('Authentication failed');
          toast.error('Your Outlook session has expired. Please reconnect your account.');
        } else {
          setError(errorData.message || 'Failed to fetch emails');
          toast.error(errorData.message || 'Failed to load emails');
        }
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        const { emails: fetchedEmails, inboxInfo: fetchedInboxInfo } = result.data;
        
        // Emails loaded from Outlook successfully
        
        // Calculate new emails since last sync
        if (lastSyncTime.current && fetchedEmails) {
          const newEmails = fetchedEmails.filter((email: Email) => {
            const received = new Date(email.received_at || '');
            return received > lastSyncTime.current!;
          });
          setNewEmailCount(newEmails.length);
          
          if (newEmails.length > 0) {
            toast.success(`${newEmails.length} new email${newEmails.length > 1 ? 's' : ''} received`);
          }
        }

        setEmails(fetchedEmails || []);
        setInboxInfo(fetchedInboxInfo);
        lastSyncTime.current = new Date();
      } else {
        setError(result.message || 'Failed to fetch emails');
        toast.error(result.message || 'Failed to load emails');
      }
    } catch (error) {
      console.error('❌ Error in fetchEmails:', error);
      setError('Failed to load emails');
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Manual sync function
  const manualSync = useCallback(async () => {
    if (!user?.id) {
      toast.error('Please log in to sync emails');
      return;
    }

    try {
      setSyncing(true);
      toast.loading('Syncing emails from Outlook...');
      
      // Call the Outlook fetch API
      const response = await fetch('/api/fetch-outlook-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.code === 'OUTLOOK_NOT_CONNECTED') {
          toast.error('Outlook not connected. Please connect your Outlook account first.');
          setError('Outlook not connected');
        } else {
          throw new Error(errorData.message || 'Failed to sync emails');
        }
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        const { emails: fetchedEmails, inboxInfo: fetchedInboxInfo } = result.data;
        setEmails(fetchedEmails || []);
        setInboxInfo(fetchedInboxInfo);
        toast.success('Emails synced successfully from Outlook');
      } else {
        throw new Error(result.message || 'Failed to sync emails');
      }
    } catch (error) {
      console.error('❌ Error in manual sync:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync emails';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSyncing(false);
    }
  }, [user?.id]);

  // Mark email as read via Microsoft Graph API
  const markAsRead = useCallback(async (emailId: string) => {
    try {
      // Marking email as read
      
      const response = await fetch('/api/mark-email-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId,
          isRead: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark email as read');
      }

      // Update local state
      setEmails(prev => 
        prev.map(email => 
          email.id === emailId 
            ? { ...email, unread: false, is_read: true }
            : email
        )
      );

              // Email marked as read successfully
      toast.success('Email marked as read');
    } catch (error) {
      console.error('❌ Error in markAsRead:', error);
      toast.error('Failed to mark email as read');
    }
  }, []);

  // Mark email as handled (local state only for now)
  const markAsHandled = useCallback(async (emailId: string) => {
    try {
      // For now, we'll update local state only
      // TODO: Implement Microsoft Graph API call to mark as handled
      setEmails(prev => 
        prev.map(email => 
          email.id === emailId 
            ? { ...email, handled: true, is_handled: true }
            : email
        )
      );

              // Email marked as handled (local state only)
      toast.success('Email marked as handled');
    } catch (error) {
      console.error('❌ Error in markAsHandled:', error);
      toast.error('Failed to mark email as handled');
    }
  }, []);

  // Flag/unflag email (local state only for now)
  const flagEmail = useCallback(async (emailId: string, flagged: boolean) => {
    try {
      // For now, we'll update local state only
      // TODO: Implement Microsoft Graph API call to flag email
      setEmails(prev => 
        prev.map(email => 
          email.id === emailId 
            ? { ...email, flag_status: flagged ? 'flagged' : null }
            : email
        )
      );

              // Email flag updated (local state only)
      toast.success(flagged ? 'Email flagged' : 'Email unflagged');
    } catch (error) {
      console.error('❌ Error in flagEmail:', error);
      toast.error('Failed to update email flag');
    }
  }, []);

  // Refresh emails
  const refreshEmails = useCallback(async () => {
    await fetchEmails();
  }, [fetchEmails]);

  // Initialize
  useEffect(() => {
    if (sessionLoading) return;

    fetchEmails();

    // Set up periodic refresh every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
              // Periodic email refresh from Outlook
      fetchEmails();
    }, 30000); // 30 seconds

    return () => {
      // Cleanup interval on unmount
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [sessionLoading, fetchEmails]);

  // Select email
  const selectEmail = useCallback((email: Email | null) => {
    setSelectedEmail(email);
    
    // Mark as read when selected
    if (email && (email.unread || !email.is_read)) {
      markAsRead(email.id);
    }
  }, [markAsRead]);

  // Auto-select first email when emails are loaded
  useEffect(() => {
    if (emails.length > 0 && !selectedEmail && !loading) {
              // Auto-selecting first email
      selectEmail(emails[0]);
    }
  }, [emails, selectedEmail, loading, selectEmail]);

  return {
    emails,
    selectedEmail,
    loading: sessionLoading || loading,
    syncing,
    error,
    isRealTimeEnabled: true, // Always true since we're using live Outlook data
    newEmailCount,
    inboxInfo,
    selectEmail,
    manualSync,
    markAsRead,
    markAsHandled,
    flagEmail,
    refreshEmails
  };
} 