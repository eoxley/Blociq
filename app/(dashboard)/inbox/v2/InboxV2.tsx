'use client';

import { useState, useCallback, useEffect } from 'react';
import { useOutlookInbox } from '@/hooks/useOutlookInbox';
import { useSession } from '@/lib/auth';
import { Search, RefreshCw } from 'lucide-react';
import FolderListV2 from './components/FolderListV2';
import EmailListV2 from './components/EmailListV2';
import EmailDetailV2 from './components/EmailDetailV2';
import ReplyModalV2 from './components/ReplyModalV2';
import { toast } from 'sonner';

export default function InboxV2() {
  const { user } = useSession();
  const {
    emails,
    selectedEmail,
    selectEmail,
    manualSync,
    loading,
    syncing,
    error,
    markAsRead,
    markAsHandled,
    refreshEmails
  } = useOutlookInbox();

  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyAction, setReplyAction] = useState<'reply' | 'reply-all' | 'forward'>('reply');

  // Filter emails based on search and folder
  const filteredEmails = emails.filter(email => {
    const matchesSearch = search === '' || 
      email.subject?.toLowerCase().includes(search.toLowerCase()) ||
      email.from_name?.toLowerCase().includes(search.toLowerCase()) ||
      email.from_email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesFolder = selectedFolder === 'inbox' || 
      (selectedFolder === 'archived' && email.is_archived) ||
      (selectedFolder === 'deleted' && email.is_deleted);
    
    return matchesSearch && matchesFolder;
  });

  // Build folders data
  const folders = [
    {
      id: 'inbox',
      name: 'Inbox',
      count: emails.filter(email => !email.is_archived && !email.is_deleted).length,
      type: 'inbox' as const
    },
    {
      id: 'archived',
      name: 'Archived',
      count: emails.filter(email => email.is_archived).length,
      type: 'archive' as const
    },
    {
      id: 'deleted',
      name: 'Deleted',
      count: emails.filter(email => email.is_deleted).length,
      type: 'deleted' as const
    }
  ];

  const handleReply = useCallback((action: 'reply' | 'reply-all' | 'forward') => {
    if (selectedEmail) {
      setReplyAction(action);
      setShowReplyModal(true);
    }
  }, [selectedEmail]);

  const handleToggleFlag = useCallback(async (emailId: string) => {
    try {
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      const newFlagStatus = email.flag_status ? null : 'flagged';
      
      // Optimistic update
      const updatedEmails = emails.map(e => 
        e.id === emailId ? { ...e, flag_status: newFlagStatus } : e
      );
      
      // TODO: Call API to update flag status
      // const response = await fetch('/api/update-email-flag', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ emailId, flagStatus: newFlagStatus }),
      // });
      
      // if (!response.ok) throw new Error('Failed to update flag');
      
      // Refresh emails to get server state
      await refreshEmails();
      toast.success(newFlagStatus ? 'Email flagged' : 'Flag removed');
    } catch (error) {
      console.error('Error toggling flag:', error);
      toast.error('Failed to update flag');
      // Refresh to revert optimistic update
      await refreshEmails();
    }
  }, [emails, refreshEmails]);

  const handleDeleteEmail = useCallback(async (emailId: string) => {
    try {
      const response = await fetch('/api/delete-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to delete email`);
      }

      const result = await response.json();
      
      if (result.success) {
        refreshEmails();
        if (selectedEmail?.id === emailId) {
          selectEmail(null);
        }
        toast.success('Email moved to deleted items');
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete email');
    }
  }, [refreshEmails, selectedEmail, selectEmail]);

  const handleMoveEmail = useCallback(async (emailId: string, folderId: string) => {
    try {
      const response = await fetch('/api/move-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId, folderId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to move email`);
      }

      const result = await response.json();
      
      if (result.success) {
        refreshEmails();
        if (selectedEmail?.id === emailId) {
          selectEmail(null);
        }
        toast.success('Email moved successfully');
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error moving email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to move email');
    }
  }, [refreshEmails, selectedEmail, selectEmail]);

  const handleSelectEmail = useCallback((emailId: string) => {
    const email = emails.find(e => e.id === emailId);
    if (email) {
      selectEmail(email);
      if (!email.is_read) {
        markAsRead(email.id);
      }
    }
  }, [emails, selectEmail, markAsRead]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Don't handle shortcuts when modal is open
      if (showReplyModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowReplyModal(false);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'r':
          if (!e.ctrlKey && !e.metaKey && selectedEmail) {
            e.preventDefault();
            handleReply('reply');
          }
          break;
        case 'a':
          if (!e.ctrlKey && !e.metaKey && selectedEmail) {
            e.preventDefault();
            handleReply('reply-all');
          }
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey && selectedEmail) {
            e.preventDefault();
            handleReply('forward');
          }
          break;
        case 'delete':
        case 'backspace':
          if (selectedEmail) {
            e.preventDefault();
            handleDeleteEmail(selectedEmail.id);
          }
          break;
        case 'escape':
          if (selectedEmail) {
            e.preventDefault();
            selectEmail(null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEmail, handleReply, handleDeleteEmail, selectEmail, showReplyModal]);

  return (
    <div className="h-[calc(100vh-200px)] flex bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Folders Sidebar */}
      <FolderListV2
        folders={folders}
        selectedFolderId={selectedFolder}
        onSelect={setSelectedFolder}
        onDropEmail={handleMoveEmail}
      />

      {/* Email List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 mr-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => manualSync()}
              disabled={syncing}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              title="Sync emails"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <EmailListV2
            emails={filteredEmails}
            selectedEmailId={selectedEmail?.id}
            onSelect={handleSelectEmail}
            onToggleFlag={handleToggleFlag}
            onDelete={handleDeleteEmail}
            loading={loading}
          />
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <EmailDetailV2
          email={selectedEmail}
          onReply={handleReply}
          onToggleFlag={handleToggleFlag}
          onDelete={handleDeleteEmail}
        />
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedEmail && (
        <ReplyModalV2
          isOpen={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          email={selectedEmail}
          action={replyAction}
          userEmail={user?.email}
        />
      )}
    </div>
  );
}
