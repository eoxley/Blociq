'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import InboxStats from './InboxStats';
import InboxFilters from './InboxFilters';
import EmailListPanel from './EmailListPanel';
import EmailViewerPanel from './EmailViewerPanel';
import InboxRealtimeUpdater from './InboxRealtimeUpdater';

interface Email {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string;
  body_preview: string | null;
  body_full?: string | null;
  received_at: string;
  unread: boolean;
  handled: boolean;
  building_id: string | null;
  building_name?: string;
  tags?: string[];
}

interface Building {
  id: string;
  name: string;
  address: string;
}

interface Filters {
  search: string;
  buildingId: string | null;
  showUnreadOnly: boolean;
  dateFrom: string | null;
  dateTo: string | null;
}

export default function InboxV3() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    buildingId: null,
    showUnreadOnly: false,
    dateFrom: null,
    dateTo: null
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    today: 0,
    flagged: 0,
    overdue: 0,
    handled: 0
  });

  const supabase = createClientComponentClient();

  // Fetch buildings
  const fetchBuildings = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get buildings the user has access to
      const { data: userBuildings } = await supabase
        .from('building_users')
        .select(`
          building_id,
          buildings (
            id,
            name,
            address
          )
        `)
        .eq('user_id', session.user.id);

      if (userBuildings) {
        const buildingList = userBuildings.map(ub => ({
          id: ub.building_id,
          name: ub.buildings.name,
          address: ub.buildings.address
        }));
        setBuildings(buildingList);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  }, [supabase]);

  // Fetch emails with filters
  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get buildings the user has access to
      const { data: userBuildings } = await supabase
        .from('building_users')
        .select('building_id')
        .eq('user_id', session.user.id);

      if (!userBuildings) return;

      const userBuildingIds = userBuildings.map(ub => ub.building_id);

      // Build query
      let query = supabase
        .from('incoming_emails')
        .select(`
          id,
          subject,
          from_name,
          from_email,
          body_preview,
          body_full,
          received_at,
          unread,
          handled,
          building_id,
          tags
        `)
        .in('building_id', userBuildingIds)
        .order('received_at', { ascending: false });

      // Apply filters
      if (filters.buildingId) {
        query = query.eq('building_id', filters.buildingId);
      }

      if (filters.showUnreadOnly) {
        query = query.eq('unread', true);
      }

      if (filters.dateFrom) {
        query = query.gte('received_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('received_at', filters.dateTo);
      }

      const { data: emailsData, error } = await query;

      if (error) {
        console.error('Error fetching emails:', error);
        return;
      }

      // Enrich emails with building names
      const enrichedEmails = (emailsData || []).map(email => ({
        ...email,
        building_name: buildings.find(b => b.id === email.building_id)?.name
      }));

      // Apply search filter
      let filteredEmails = enrichedEmails;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredEmails = enrichedEmails.filter(email =>
          email.subject?.toLowerCase().includes(searchLower) ||
          email.from_name?.toLowerCase().includes(searchLower) ||
          email.from_email.toLowerCase().includes(searchLower) ||
          email.body_preview?.toLowerCase().includes(searchLower)
        );
      }

      setEmails(filteredEmails);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const statsData = {
        total: enrichedEmails.length,
        unread: enrichedEmails.filter(e => e.unread).length,
        today: enrichedEmails.filter(e => new Date(e.received_at) >= today).length,
        flagged: enrichedEmails.filter(e => e.tags && e.tags.includes('flagged')).length,
        overdue: enrichedEmails.filter(e => {
          const received = new Date(e.received_at);
          const hoursDiff = (Date.now() - received.getTime()) / (1000 * 60 * 60);
          return hoursDiff > 48 && e.unread;
        }).length,
        handled: enrichedEmails.filter(e => e.handled).length
      };

      setStats(statsData);

    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, filters, buildings]);

  // Handle email selection
  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email);
    
    // Mark as read if unread
    if (email.unread) {
      handleMarkAsRead(email.id);
    }
  };

  // Handle mark as read/unread
  const handleMarkAsRead = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('incoming_emails')
        .update({ unread: false })
        .eq('id', emailId);

      if (error) {
        console.error('Error marking email as read:', error);
        return;
      }

      // Update local state
      setEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, unread: false } : email
      ));

      // Update selected email if it's the current one
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, unread: false } : null);
      }

      // Refresh stats
      fetchEmails();
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  // Handle mark as handled
  const handleMarkAsHandled = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('incoming_emails')
        .update({ handled: true, unread: false })
        .eq('id', emailId);

      if (error) {
        console.error('Error marking email as handled:', error);
        return;
      }

      // Update local state
      setEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, handled: true, unread: false } : email
      ));

      // Update selected email if it's the current one
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, handled: true, unread: false } : null);
      }

      // Refresh stats
      fetchEmails();
    } catch (error) {
      console.error('Error marking email as handled:', error);
    }
  };

  // Handle flag email
  const handleFlagEmail = async (emailId: string) => {
    try {
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      const currentTags = email.tags || [];
      const newTags = currentTags.includes('flagged') 
        ? currentTags.filter(tag => tag !== 'flagged')
        : [...currentTags, 'flagged'];

      const { error } = await supabase
        .from('incoming_emails')
        .update({ tags: newTags })
        .eq('id', emailId);

      if (error) {
        console.error('Error flagging email:', error);
        return;
      }

      // Update local state
      setEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, tags: newTags } : email
      ));

      // Update selected email if it's the current one
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, tags: newTags } : null);
      }

      // Refresh stats
      fetchEmails();
    } catch (error) {
      console.error('Error flagging email:', error);
    }
  };

  // Handle reply sent
  const handleReplySent = (emailId: string, replyText: string) => {
    // In production, you would log this reply to your system
    console.log('Reply sent for email:', emailId, replyText);
    
    // Mark as handled
    handleMarkAsHandled(emailId);
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchEmails();
  };

  // Initial data fetch
  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    if (buildings.length > 0) {
      fetchEmails();
    }
  }, [fetchEmails, buildings]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">BlocIQ Inbox</h1>
        <p className="text-gray-600">AI-powered email management for property managers</p>
      </div>

      <div className="px-6 py-6">
        {/* Stats */}
        <InboxStats stats={stats} />

        {/* Filters */}
        <InboxFilters
          buildings={buildings}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
          {/* Email List */}
          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Emails ({emails.length})
              </h2>
            </div>
            <div className="h-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <EmailListPanel
                  emails={emails}
                  selectedEmailId={selectedEmail?.id || null}
                  onEmailSelect={handleEmailSelect}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAsHandled={handleMarkAsHandled}
                  onFlagEmail={handleFlagEmail}
                />
              )}
            </div>
          </div>

          {/* Email Viewer */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
            <EmailViewerPanel
              email={selectedEmail}
              onMarkAsRead={handleMarkAsRead}
              onMarkAsHandled={handleMarkAsHandled}
              onFlagEmail={handleFlagEmail}
              onReplySent={handleReplySent}
            />
          </div>
        </div>
      </div>

      {/* Realtime Updates */}
      <InboxRealtimeUpdater onUpdate={fetchEmails} />
    </div>
  );
}
