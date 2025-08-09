'use client';

import { useState, useCallback, useEffect } from 'react';
import { useOutlookInbox } from '@/hooks/useOutlookInbox';
import { useSession } from '@/lib/auth';
import { Search, RefreshCw, Reply, ReplyAll, Forward, Trash2 } from 'lucide-react';
import FolderListV2 from './components/FolderListV2';
import EmailListV2 from './components/EmailListV2';
import EmailDetailV2 from './components/EmailDetailV2';
import ReplyModalV2 from './components/ReplyModalV2';
import { toast } from 'sonner';

interface OutlookFolder {
  id: string;
  displayName: string;
  wellKnownName?: string;
}

export default function InboxV2() {
  const { user } = useSession();
  const {
    emails, selectedEmail, selectEmail, manualSync, loading, syncing, refreshEmails, markAsRead
  } = useOutlookInbox();

  const [search, setSearch] = useState('');
  const [folders, setFolders] = useState<OutlookFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyAction, setReplyAction] = useState<'reply' | 'reply-all' | 'forward'>('reply');

  // Fetch folders on component mount
  useEffect(() => {
    fetchFolders();
  }, []);

  // Fetch Outlook folders
  const fetchFolders = async () => {
    try {
      setLoadingFolders(true);
      const res = await fetch('/api/folders', { method: 'GET' });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load folders');
      }
      
      // Normalize: only id + displayName + wellKnownName
      const items = (data.items || []).map((f: any) => ({
        id: f.id,
        displayName: f.displayName || f.wellKnownName || 'Untitled',
        wellKnownName: f.wellKnownName || undefined,
      }));
      
      setFolders(items);
      
      // Default select Inbox if nothing selected
      if (!selectedFolderId) {
        const inbox = items.find((f: any) =>
          (f.wellKnownName || '').toLowerCase() === 'inbox' ||
          f.displayName.toLowerCase() === 'inbox'
        );
        setSelectedFolderId(inbox?.id || items[0]?.id || null);
      }
    } catch (e) {
      console.error('Error fetching folders:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to load folders');
    } finally {
      setLoadingFolders(false);
    }
  };

  // Handle folder selection
  const handleSelectFolder = useCallback((id: string) => {
    setSelectedFolderId(id);
    // TODO: Implement fetchEmailsForFolder when you have folder-specific email fetching
    // For now, just refresh the general email list
    refreshEmails();
  }, [refreshEmails]);

  // Handle email drop on folder
  const handleDropEmailOnFolder = useCallback(async (emailId: string, folderId: string) => {
    try {
      const res = await fetch('/api/move-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, folderId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to move email');
      }
      
      toast.success('Email moved successfully');
      
      // Refresh both folders (counts can change) and emails for selected folder
      fetchFolders();
      refreshEmails();
      
      // If the moved email was selected, deselect it
      if (selectedEmail?.id === emailId) {
        selectEmail(null);
      }
    } catch (e) {
      console.error('Error moving email:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to move email');
    }
  }, [selectedEmail, selectEmail, refreshEmails]);

  // Filter emails based on search
  const filteredEmails = emails.filter(email => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(searchLower) ||
      email.from_name?.toLowerCase().includes(searchLower) ||
      email.from_email?.toLowerCase().includes(searchLower) ||
      email.body_preview?.toLowerCase().includes(searchLower)
    );
  });

  // Reply handlers
  const handleReply = useCallback((action: 'reply' | 'reply-all' | 'forward') => {
    if (!selectedEmail) return;
    setReplyAction(action);
    setShowReplyModal(true);
  }, [selectedEmail]);

  // Delete email handler
  const handleDeleteEmail = useCallback(async (emailId: string) => {
    try {
      const res = await fetch('/api/delete-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to delete email');
      }

      toast.success('Email deleted');
      refreshEmails();
      
      // If the deleted email was selected, deselect it
      if (selectedEmail?.id === emailId) {
        selectEmail(null);
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete email');
    }
  }, [selectedEmail, selectEmail, refreshEmails]);

  // Move email handler (for DnD)
  const handleMoveEmail = useCallback(async (emailId: string, folderId: string) => {
    await handleDropEmailOnFolder(emailId, folderId);
  }, [handleDropEmailOnFolder]);

  // Toggle flag handler
  const handleToggleFlag = useCallback(async (emailId: string) => {
    try {
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      const res = await fetch('/api/update-email-flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailId, 
          flagStatus: email.flag_status ? null : 'flagged' 
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to update flag');
      }

      toast.success(email.flag_status ? 'Flag removed' : 'Email flagged');
      refreshEmails();
    } catch (error) {
      console.error('Error toggling flag:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update flag');
    }
  }, [emails, refreshEmails]);

  // Select email handler
  const handleSelectEmail = useCallback((emailId: string) => {
    const email = emails.find(e => e.id === emailId);
    if (email) {
      selectEmail(email);
      markAsRead(emailId);
    }
  }, [emails, selectEmail, markAsRead]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
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
        case 'r': if (!e.ctrlKey && !e.metaKey && selectedEmail) { e.preventDefault(); handleReply('reply'); } break;
        case 'a': if (!e.ctrlKey && !e.metaKey && selectedEmail) { e.preventDefault(); handleReply('reply-all'); } break;
        case 'f': if (!e.ctrlKey && !e.metaKey && selectedEmail) { e.preventDefault(); handleReply('forward'); } break;
        case 'delete': case 'backspace':
          if (selectedEmail) { e.preventDefault(); handleDeleteEmail(selectedEmail.id); } break;
        case 'escape':
          if (selectedEmail) { e.preventDefault(); selectEmail(null); } break;
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
        selectedFolderId={selectedFolderId}
        loading={loadingFolders}
        onSelect={(id) => {
          if (id) handleSelectFolder(id);
          else fetchFolders(); // if refresh clicked
        }}
        onDropEmail={handleDropEmailOnFolder}
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
