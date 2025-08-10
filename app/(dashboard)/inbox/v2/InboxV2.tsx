'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useOutlookInbox } from '@/hooks/useOutlookInbox';
import { useSession } from '@/lib/auth';
import FolderListV2 from './components/FolderListV2';
import EmailListV2 from './components/EmailListV2';
import EmailDetailV2 from './components/EmailDetailV2';
import ReplyModalV2 from './components/ReplyModalV2';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Plus } from 'lucide-react';

interface OutlookFolder {
  id: string;
  displayName: string;
  wellKnownName?: string;
}

export default function InboxV2() {
  const aiEnabled = process.env.NEXT_PUBLIC_AI_ENABLED === 'true';
  const { user } = useSession();
  
  // Use existing hook for email management
  const {
    emails,
    selectedEmail,
    loading,
    syncing,
    error,
    selectEmail,
    manualSync,
    markAsRead,
    markAsHandled,
    flagEmail,
    refreshEmails
  } = useOutlookInbox();

  // V2-specific state
  const [folders, setFolders] = useState<OutlookFolder[]>([
    { id: 'inbox', displayName: 'Inbox', wellKnownName: 'inbox' },
    { id: 'drafts', displayName: 'Drafts', wellKnownName: 'drafts' },
    { id: 'sent', displayName: 'Sent Items', wellKnownName: 'sentitems' },
    { id: 'deleted', displayName: 'Deleted Items', wellKnownName: 'deleteditems' },
    { id: 'archive', displayName: 'Archive', wellKnownName: 'archive' }
  ]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('inbox');
  const [foldersLoading, setFoldersLoading] = useState(false);
  
  // Reply modal state
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyAction, setReplyAction] = useState<'reply' | 'reply-all' | 'forward'>('reply');

  // Derived state
  const selectedEmailId = selectedEmail?.id || null;

  // Filter emails by selected folder (for now, just show inbox emails)
  const filteredEmails = useMemo(() => {
    if (selectedFolderId === 'inbox') {
      return emails.filter(email => !email.is_handled && !email.handled);
    }
    // TODO: Implement proper folder filtering when folder sync is available
    return emails;
  }, [emails, selectedFolderId]);

  // Folder selection handler
  const handleSelectFolder = useCallback((folderId: string | null) => {
    if (folderId === null) {
      // Refresh folders
      setFoldersLoading(true);
      // TODO: Implement folder refresh
      setTimeout(() => setFoldersLoading(false), 1000);
      return;
    }
    setSelectedFolderId(folderId);
  }, []);

  // Email selection handler
  const handleSelectEmail = useCallback(async (emailId: string) => {
    const email = emails.find(e => e.id === emailId);
    if (email) {
      selectEmail(email);
      // Mark as read if unread
      if (email.unread || !email.is_read) {
        await markAsRead(emailId);
      }
    }
  }, [emails, selectEmail, markAsRead]);

  // Email actions
  const handleToggleFlag = useCallback(async (emailId: string) => {
    const email = emails.find(e => e.id === emailId);
    if (email) {
      const isFlagged = email.flag_status === 'flagged';
      await flagEmail(emailId, !isFlagged);
    }
  }, [emails, flagEmail]);

  const handleDeleteEmail = useCallback(async (emailId: string) => {
    try {
      const response = await fetch('/api/delete-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      });

      if (response.ok) {
        toast.success('Email moved to deleted items');
        await refreshEmails();
        if (selectedEmail?.id === emailId) {
          selectEmail(null);
        }
      } else {
        throw new Error('Failed to delete email');
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Failed to delete email');
    }
  }, [selectedEmail, selectEmail, refreshEmails]);

  const handleDropEmail = useCallback(async (emailId: string, folderId: string) => {
    try {
      // For now, just mark as handled if moving to archive
      if (folderId === 'archive') {
        await markAsHandled(emailId);
        toast.success('Email moved to archive');
      } else {
        // TODO: Implement proper folder moving
        toast.info('Folder moving not yet implemented');
      }
      await refreshEmails();
    } catch (error) {
      console.error('Error moving email:', error);
      toast.error('Failed to move email');
    }
  }, [markAsHandled, refreshEmails]);

  // Reply actions
  const handleReply = useCallback((action: 'reply' | 'reply-all' | 'forward') => {
    if (selectedEmail) {
      setReplyAction(action);
      setIsReplyOpen(true);
    }
  }, [selectedEmail]);

  const handleCreateAIDraft = useCallback(async (action: 'reply' | 'reply-all' | 'forward') => {
    if (!selectedEmail) return;

    try {
      const response = await fetch('/api/ask-blociq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a ${action} draft in the property manager tone.`,
          mode: 'draft',
          action: action,
          email_id: selectedEmail.id,
          building_id: selectedEmail.building_id,
          include_thread: true
        }),
      });

      if (response.ok) {
        toast.success(`AI ${action} draft created and saved to Outlook Drafts`);
      } else {
        throw new Error('Failed to create AI draft');
      }
    } catch (error) {
      console.error('Error creating AI draft:', error);
      toast.error('Failed to create AI draft');
    }
  }, [selectedEmail]);

  const handleTriage = useCallback(() => {
    // TODO: Implement AI triage
    toast.info('AI triage coming soon');
  }, []);

  // Sync handler
  const handleSync = useCallback(async () => {
    try {
      await manualSync();
      toast.success('Inbox synced successfully');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync inbox');
    }
  }, [manualSync]);

  // New email handler
  const handleNewEmail = useCallback(() => {
    setReplyAction('reply');
    setIsReplyOpen(true);
  }, []);

  // Close reply modal
  const handleCloseReply = useCallback(() => {
    setIsReplyOpen(false);
  }, []);

  // Load initial data
  useEffect(() => {
    if (user) {
      refreshEmails();
    }
  }, [user, refreshEmails]);

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA]">
      {/* Hero/Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#333]">Inbox</h1>
            <p className="text-sm text-gray-600">AI-powered filing, drafts & triage</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button 
              className="bg-[#2BBEB4] hover:bg-[#0F5D5D]" 
              onClick={handleNewEmail}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Email
            </Button>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="flex-1 grid grid-cols-12 gap-0">
        {/* Folders */}
        <aside className="col-span-3 border-r bg-white">
          <FolderListV2
            folders={folders}
            selectedFolderId={selectedFolderId}
            loading={foldersLoading}
            onSelect={handleSelectFolder}
            onDropEmail={handleDropEmail}
          />
        </aside>

        {/* Email list */}
        <section className="col-span-4 border-r bg-white">
          <EmailListV2
            emails={filteredEmails}
            selectedEmailId={selectedEmailId}
            onSelect={handleSelectEmail}
            onToggleFlag={handleToggleFlag}
            onDelete={handleDeleteEmail}
            loading={loading}
          />
        </section>

        {/* Detail */}
        <section className="col-span-5 bg-white">
          <EmailDetailV2
            email={selectedEmail}
            onReply={handleReply}
            onToggleFlag={handleToggleFlag}
            onDelete={handleDeleteEmail}
            onCreateAIDraft={aiEnabled ? handleCreateAIDraft : undefined}
            onTriage={aiEnabled ? handleTriage : undefined}
          />
        </section>
      </div>

      {/* Reply / Compose Modal */}
      <ReplyModalV2
        isOpen={isReplyOpen}
        onClose={handleCloseReply}
        email={selectedEmail}
        action={replyAction}
        userEmail={user?.email}
      />
    </div>
  );
}
