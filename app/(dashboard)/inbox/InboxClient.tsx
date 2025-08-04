'use client';

import { useEffect, useState } from 'react';
import { useLiveInbox } from '@/hooks/useLiveInbox';
import EnhancedEmailDetailView from './components/EnhancedEmailDetailView';
import SimpleFolderSidebar from './components/SimpleFolderSidebar';
import { useUser } from '@supabase/auth-helpers-react';
import { AlertTriangle, RefreshCw, Mail, Wifi, WifiOff } from 'lucide-react';

export default function InboxClient() {
  const {
    emails,
    selectedEmail,
    selectEmail,
    manualSync,
    isRealTimeEnabled,
    loading,
    syncing,
    error,
    newEmailCount,
    markAsRead,
    markAsHandled,
    flagEmail
  } = useLiveInbox();

  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const user = useUser();

  // Generate folders based on email data
  const folders = [
    {
      id: 'inbox',
      label: 'Inbox',
      count: emails.length,
      icon: '📥'
    },
    {
      id: 'unread',
      label: 'Unread',
      count: emails.filter(e => e.unread || !e.is_read).length,
      icon: '📬'
    },
    {
      id: 'flagged',
      label: 'Flagged',
      count: emails.filter(e => e.flag_status === 'flagged').length,
      icon: '🚩'
    },
    {
      id: 'handled',
      label: 'Handled',
      count: emails.filter(e => e.handled || e.is_handled).length,
      icon: '✅'
    }
  ];

  // Filter emails based on search and folder
  const filteredEmails = emails.filter(email => {
    // First filter by folder
    let folderMatch = true;
    switch (selectedFolder) {
      case 'unread':
        folderMatch = Boolean(email.unread || !email.is_read);
        break;
      case 'flagged':
        folderMatch = email.flag_status === 'flagged';
        break;
      case 'handled':
        folderMatch = Boolean(email.handled || email.is_handled);
        break;
      case 'inbox':
      default:
        folderMatch = true; // Show all emails in inbox
        break;
    }

    if (!folderMatch) return false;

    // Then filter by search
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(searchLower) ||
      email.from_name?.toLowerCase().includes(searchLower) ||
      email.from_email?.toLowerCase().includes(searchLower) ||
      email.body_preview?.toLowerCase().includes(searchLower) ||
      email.body_full?.toLowerCase().includes(searchLower)
    );
  });

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
    // Clear selected email when changing folders
    if (selectedEmail) {
      selectEmail(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">📨 Inbox</h1>
          {newEmailCount > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
              {newEmailCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            {isRealTimeEnabled ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="h-4 w-4" />
                <span className="font-medium">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-500">
                <WifiOff className="h-4 w-4" />
                <span>Offline</span>
              </div>
            )}
          </div>
          <button
            onClick={manualSync}
            disabled={syncing || loading}
            className="flex items-center gap-2 text-indigo-600 hover:underline transition disabled:opacity-50"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncing ? 'Syncing...' : 'Manual Sync'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-800">Error loading emails</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-[320px_1fr] gap-6">
        {/* Sidebar */}
        <div className="w-full">
          <SimpleFolderSidebar 
            folders={folders} 
            selectedFolder={selectedFolder}
            onFolderSelect={handleFolderSelect}
          />
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-4">
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search emails by subject, sender, or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-400"
            />
            {(search || selectedFolder !== 'inbox') && (
              <span className="text-sm text-gray-500">
                {filteredEmails.length} of {emails.length} emails
              </span>
            )}
          </div>

          {/* Email List & Details */}
          <div className="grid grid-cols-2 gap-6">
            {/* Email List */}
            <div className="bg-white rounded-xl shadow p-4 overflow-y-auto max-h-[calc(100vh-220px)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-gray-500">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Loading emails...</span>
                  </div>
                </div>
              ) : filteredEmails.length > 0 ? (
                <ul className="space-y-3">
                  {filteredEmails.map((email) => (
                    <li
                      key={email.id}
                      onClick={() => selectEmail(email)}
                      className={`p-3 rounded-xl cursor-pointer transition hover:bg-indigo-50 ${
                        selectedEmail?.id === email.id ? 'bg-indigo-100 border border-indigo-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-indigo-800 truncate">
                            {email.from_name || email.from_email || 'Unknown sender'}
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {email.subject || 'No subject'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {email.received_at ? new Date(email.received_at).toLocaleDateString() : 'Unknown date'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {(email.unread || !email.is_read) && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          {email.flag_status === 'flagged' && (
                            <span className="text-red-500">🚩</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {search ? 'No emails match your search.' : `No emails in ${selectedFolder}.`}
                </div>
              )}
            </div>

            {/* Email Detail Panel */}
            <div className="bg-white rounded-xl shadow p-6 min-h-[300px]">
              {selectedEmail ? (
                <EnhancedEmailDetailView 
                  email={selectedEmail}
                  onMarkAsRead={markAsRead}
                  onMarkAsHandled={markAsHandled}
                  onFlagEmail={flagEmail}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-gray-500 h-full">
                  <div className="text-4xl mb-2">📥</div>
                  <h2 className="text-lg font-semibold">Select an email</h2>
                  <p className="text-sm text-gray-400">
                    Choose an email from the list to view its details and generate AI-powered replies.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 