"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/lib/auth';
import { toast } from 'sonner';

interface Email {
  id: string;
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
  tags: string[] | null;
  building_id: number | null;
  unit_id: number | null;
  leaseholder_id: string | null;
  outlook_id: string | null;
  user_id: string | null;
  ai_tag?: string | null;
  triage_category?: string | null;
}

interface UseLiveInboxReturn {
  emails: Email[];
  selectedEmail: Email | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  isRealTimeEnabled: boolean;
  newEmailCount: number;
  selectEmail: (email: Email | null) => void;
  manualSync: () => Promise<void>;
  markAsRead: (emailId: string) => Promise<void>;
  markAsHandled: (emailId: string) => Promise<void>;
  flagEmail: (emailId: string, flagged: boolean) => Promise<void>;
  refreshEmails: () => Promise<void>;
}

export function useLiveInbox(): UseLiveInboxReturn {
  const { user, loading: sessionLoading } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [newEmailCount, setNewEmailCount] = useState(0);
  
  const subscriptionRef = useRef<any>(null);
  const lastSyncTime = useRef<Date | null>(null);

  // Fetch emails from Supabase
  const fetchEmails = useCallback(async () => {
    if (!user?.id) {
      console.log('👤 No user ID, skipping email fetch');
      setLoading(false);
      return;
    }

    try {
      console.log('📧 Fetching emails for user:', user.id);
      setError(null);

      // First, let's check if we can access the table at all
      const { count: totalCount, error: countError } = await supabase
        .from('incoming_emails')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Error counting emails:', countError);
        setError(`Database access error: ${countError.message}`);
        toast.error('Database access error');
        return;
      }

      console.log('📊 Total emails in database:', totalCount);

      // Now fetch emails for this user
      const { data, error } = await supabase
        .from('incoming_emails')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(100); // Limit to prevent performance issues

      if (error) {
        console.error('❌ Error fetching emails:', error);
        setError(`Failed to fetch emails: ${error.message}`);
        toast.error('Failed to load emails');
        return;
      }

      console.log('✅ Emails loaded:', data?.length || 0, 'items for user');
      
      // Calculate new emails since last sync
      if (lastSyncTime.current && data) {
        const newEmails = data.filter(email => {
          const received = new Date(email.received_at || '');
          return received > lastSyncTime.current!;
        });
        setNewEmailCount(newEmails.length);
        
        if (newEmails.length > 0) {
          toast.success(`${newEmails.length} new email${newEmails.length > 1 ? 's' : ''} received`);
        }
      }

      setEmails(data || []);
      lastSyncTime.current = new Date();
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
      toast.loading('Syncing emails...');
      
      // Call the sync API
      const response = await fetch('/api/sync-inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error cases
        if (errorData.code === 'OUTLOOK_NOT_CONNECTED') {
          toast.error('Outlook not connected. Please connect your Outlook account first.');
          setError('Outlook not connected');
        } else {
          throw new Error(errorData.error || 'Failed to sync emails');
        }
        return;
      }

      // Refresh emails after sync
      await fetchEmails();
      toast.success('Emails synced successfully');
    } catch (error) {
      console.error('❌ Error in manual sync:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync emails';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSyncing(false);
    }
  }, [user?.id, fetchEmails]);

  // Mark email as read
  const markAsRead = useCallback(async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('incoming_emails')
        .update({ 
          unread: false, 
          is_read: true 
        })
        .eq('id', emailId);

      if (error) {
        console.error('❌ Error marking email as read:', error);
        toast.error('Failed to mark email as read');
        return;
      }

      // Update local state
      setEmails(prev => 
        prev.map(email => 
          email.id === emailId 
            ? { ...email, unread: false, is_read: true }
            : email
        )
      );

      console.log('✅ Email marked as read successfully');
    } catch (error) {
      console.error('❌ Error in markAsRead:', error);
      toast.error('Failed to mark email as read');
    }
  }, []);

  // Mark email as handled
  const markAsHandled = useCallback(async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('incoming_emails')
        .update({ 
          handled: true, 
          is_handled: true 
        })
        .eq('id', emailId);

      if (error) {
        console.error('❌ Error marking email as handled:', error);
        toast.error('Failed to mark email as handled');
        return;
      }

      // Update local state
      setEmails(prev => 
        prev.map(email => 
          email.id === emailId 
            ? { ...email, handled: true, is_handled: true }
            : email
        )
      );

      console.log('✅ Email marked as handled successfully');
    } catch (error) {
      console.error('❌ Error in markAsHandled:', error);
      toast.error('Failed to mark email as handled');
    }
  }, []);

  // Flag/unflag email
  const flagEmail = useCallback(async (emailId: string, flagged: boolean) => {
    try {
      const { error } = await supabase
        .from('incoming_emails')
        .update({ 
          flag_status: flagged ? 'flagged' : null 
        })
        .eq('id', emailId);

      if (error) {
        console.error('❌ Error flagging email:', error);
        toast.error('Failed to update email flag');
        return;
      }

      // Update local state
      setEmails(prev => 
        prev.map(email => 
          email.id === emailId 
            ? { ...email, flag_status: flagged ? 'flagged' : null }
            : email
        )
      );

      console.log('✅ Email flag updated successfully');
    } catch (error) {
      console.error('❌ Error in flagEmail:', error);
      toast.error('Failed to update email flag');
    }
  }, []);

  // Refresh emails
  const refreshEmails = useCallback(async () => {
    await fetchEmails();
  }, [fetchEmails]);

  // Setup real-time subscription
  const setupRealTimeSubscription = useCallback(async () => {
    if (!user?.id) {
      console.log('👤 No user ID, skipping real-time setup');
      return;
    }

    try {
      // Clean up existing subscription
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current);
      }

      console.log('🔗 Setting up real-time subscription for user:', user.id);

      // Create new subscription with user filter
      const channel = supabase
        .channel('live_inbox_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'incoming_emails',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔄 Real-time update received:', payload);
            
            // Handle different types of changes
            if (payload.eventType === 'INSERT') {
              // New email received
              const newEmail = payload.new as Email;
              setEmails(prev => [newEmail, ...prev]);
              setNewEmailCount(prev => prev + 1);
              toast.success('New email received!');
            } else if (payload.eventType === 'UPDATE') {
              // Email updated
              const updatedEmail = payload.new as Email;
              setEmails(prev => 
                prev.map(email => 
                  email.id === updatedEmail.id ? updatedEmail : email
                )
              );
            } else if (payload.eventType === 'DELETE') {
              // Email deleted
              const deletedEmail = payload.old as Email;
              setEmails(prev => 
                prev.filter(email => email.id !== deletedEmail.id)
              );
            }
          }
        )
        .subscribe((status) => {
          console.log('🔗 Real-time subscription status:', status);
          setIsRealTimeEnabled(status === 'SUBSCRIBED');
        });

      subscriptionRef.current = channel;
      console.log('✅ Real-time subscription enabled');
    } catch (error) {
      console.error('❌ Error setting up real-time subscription:', error);
      setIsRealTimeEnabled(false);
    }
  }, [user?.id]);

  // Initialize
  useEffect(() => {
    if (sessionLoading) return;

    fetchEmails();
    setupRealTimeSubscription();

    return () => {
      // Cleanup subscription on unmount
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [sessionLoading, fetchEmails, setupRealTimeSubscription]);

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
      console.log('📧 Auto-selecting first email');
      selectEmail(emails[0]);
    }
  }, [emails, selectedEmail, loading, selectEmail]);

  return {
    emails,
    selectedEmail,
    loading: sessionLoading || loading,
    syncing,
    error,
    isRealTimeEnabled,
    newEmailCount,
    selectEmail,
    manualSync,
    markAsRead,
    markAsHandled,
    flagEmail,
    refreshEmails
  };
} 