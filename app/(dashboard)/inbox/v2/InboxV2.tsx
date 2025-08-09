'use client';

import { useState, useCallback, useEffect } from 'react';
import { useOutlookInbox } from '@/hooks/useOutlookInbox';
import { useSession } from '@/lib/auth';
import { Mail, Search, RefreshCw, Plus, FolderOpen, Inbox, Archive, Trash2, Star, ChevronDown, Reply, ReplyAll, Forward } from 'lucide-react';
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

  const handleReply = useCallback((action: 'reply' | 'reply-all' | 'forward') => {
    if (selectedEmail) {
      setReplyAction(action);
      setShowReplyModal(true);
    }
  }, [selectedEmail]);

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

  // DnD handlers
  const handleDragStart = (e: React.DragEvent, emailId: string) => {
    e.dataTransfer.setData('emailId', emailId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const emailId = e.dataTransfer.getData('emailId');
    if (emailId) {
      handleMoveEmail(emailId, folderId);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
  }, [selectedEmail, handleReply, handleDeleteEmail, selectEmail]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getFolderCount = (folder: string) => {
    return emails.filter(email => {
      if (folder === 'inbox') return !email.is_archived && !email.is_deleted;
      if (folder === 'archived') return email.is_archived;
      if (folder === 'deleted') return email.is_deleted;
      return false;
    }).length;
  };

  const getFolderId = (folderName: string) => {
    switch (folderName) {
      case 'inbox': return 'inbox';
      case 'archived': return 'archived';
      case 'deleted': return 'deleted';
      default: return 'inbox';
    }
  };

  return (
    <div className="h-[calc(100vh-200px)] flex bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Folders Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Folders</h2>
          <button
            onClick={() => manualSync()}
            disabled={syncing}
            className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
        
        <div className="flex-1 p-2">
          <div className="space-y-1">
            {[
              { id: 'inbox', name: 'Inbox', icon: Inbox },
              { id: 'archived', name: 'Archived', icon: Archive },
              { id: 'deleted', name: 'Deleted', icon: Trash2 }
            ].map((folder) => {
              const Icon = folder.icon;
              return (
                <div
                  key={folder.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  className={`rounded-md transition-colors ${
                    selectedFolder === folder.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                >
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                      selectedFolder === folder.id 
                        ? 'text-blue-700' 
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="h-4 w-4 mr-3" />
                      <span>{folder.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{getFolderCount(folder.id)}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <Mail className="h-8 w-8 mr-2" />
              No emails found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, email.id)}
                  onClick={() => {
                    selectEmail(email);
                    if (!email.is_read) {
                      markAsRead(email.id);
                    }
                  }}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedEmail?.id === email.id
                      ? 'bg-blue-50 border-r-2 border-blue-500'
                      : 'hover:bg-gray-50'
                  } ${!email.is_read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {!email.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                      <span className="font-medium text-gray-900 truncate">
                        {email.from_name || email.from_email}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatDate(email.received_at)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1 truncate">
                    {email.subject || 'No Subject'}
                  </div>
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {email.body_preview || 'No preview available'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col">
        {/* Action Bar */}
        {selectedEmail && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleReply('reply')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                title="Reply (R)"
              >
                <Reply className="h-4 w-4" />
                <span>Reply</span>
              </button>
              <button
                onClick={() => handleReply('reply-all')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                title="Reply All (A)"
              >
                <ReplyAll className="h-4 w-4" />
                <span>Reply All</span>
              </button>
              <button
                onClick={() => handleReply('forward')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                title="Forward (F)"
              >
                <Forward className="h-4 w-4" />
                <span>Forward</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDeleteEmail(selectedEmail.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                title="Delete (Del)"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
        
        <div className="flex-1">
          <EmailDetailV2
            email={selectedEmail}
            onReply={handleReply}
            onDelete={handleDeleteEmail}
          />
        </div>
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
