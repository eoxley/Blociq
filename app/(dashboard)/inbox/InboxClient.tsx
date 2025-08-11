'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOutlookInbox } from '@/hooks/useOutlookInbox';
import EnhancedEmailDetailView from './components/EnhancedEmailDetailView';
import SimpleFolderSidebar from './components/SimpleFolderSidebar';
import TriageModal from './components/TriageModal';
import ComposeEmailModal from './components/ComposeEmailModal';
import ReplyModal from './components/ReplyModal';
import CreateFolderModal from './components/CreateFolderModal'; // Added CreateFolderModal
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/lib/supabaseClient';
import { AlertTriangle, RefreshCw, Mail, Wifi, WifiOff, X, Plus, FolderOpen } from 'lucide-react';
import TriageIcon from '@/components/icons/TriageIcon';
import { toast } from 'sonner';

// Error boundary component to catch rendering errors
function ErrorBoundary({ children, fallback }: { children: React.ReactNode, fallback: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return <>{fallback}</>;
  }
  
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('InboxClient rendering error:', error);
    setHasError(true);
    return <>{fallback}</>;
  }
}

export default function InboxClient() {
  // Defensive hook initialization - wrap in try-catch to prevent crashes
  let hookData;
  try {
    hookData = useOutlookInbox();
  } catch (hookError) {
    console.error('InboxClient hook initialization error:', hookError);
    // Return fallback UI if hook fails to initialize
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to initialize inbox</h2>
          <p className="text-gray-600 mb-4">Please refresh the page to try again</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

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
    inboxInfo,
    markAsRead,
    markAsHandled,
    flagEmail,
    refreshEmails
  } = hookData;

  // Defensive error handling - prevent crashes if hook fails
  if (error) {
    console.error('InboxClient hook error:', error);
    // Don't crash, just log the error
  }

  // Defensive data handling - ensure we have valid arrays
  const safeEmails = Array.isArray(emails) ? emails : [];
  const safeInboxInfo = inboxInfo || { totalCount: 0, unreadCount: 0 };

  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyEmail, setReplyEmail] = useState<any>(null);
  const [replyAction, setReplyAction] = useState<'reply' | 'reply-all' | 'forward'>('reply');
  const [draftsCount, setDraftsCount] = useState(0);
  const [showMobileFolders, setShowMobileFolders] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const user = useUser();

  // Keyboard shortcuts support - moved after function definitions
  


  // Generate folders based on email data and Outlook inbox info
  const folders = [
    {
      id: 'inbox',
      label: 'Inbox',
      count: safeInboxInfo.totalCount || safeEmails.length,
      icon: '📥'
    },
    {
      id: 'unread',
      label: 'Unread',
      count: safeInboxInfo.unreadCount || safeEmails.filter(e => e.unread || !e.is_read).length,
      icon: '📬'
    },
    {
      id: 'flagged',
      label: 'Flagged',
      count: safeEmails.filter(e => e.flag_status === 'flagged').length,
      icon: '🚩'
    },
    {
      id: 'handled',
      label: 'Handled',
      count: safeEmails.filter(e => e.handled || e.is_handled).length,
      icon: '✅'
    }
  ];

  // AI-generated folders based on triage categories
  const aiFolders = [
    { id: 'complaints', label: 'Complaints', count: 0, icon: '⚠️' },
    { id: 's20-notices', label: 'S20 Notices', count: 0, icon: '📋' },
    { id: 'insurance', label: 'Insurance Queries', count: 0, icon: '🛡️' },
    { id: 'leaks', label: 'Leaks & Maintenance', count: 0, icon: '🔧' },
    { id: 'drafts', label: 'Drafts', count: draftsCount, icon: '📝' }
  ];

  // Get all emails for triage (not just unread)
  const allEmails = safeEmails;

  // Fetch drafts count
  useEffect(() => {
    const fetchDraftsCount = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_generated_drafts')
          .select('id', { count: 'exact' })
          .eq('user_id', user?.id);
        
        if (!error && data) {
          setDraftsCount(data.length);
        }
      } catch (error) {
        console.error('Error fetching drafts count:', error);
      }
    };

    if (user?.id) {
      fetchDraftsCount();
    }
  }, [user?.id]);

  // Filter emails based on search and folder
  const filteredEmails = safeEmails.filter(email => {
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
      case 'complaints':
        folderMatch = email.ai_tag === 'complaint' || email.triage_category === 'complaint';
        break;
      case 's20-notices':
        folderMatch = email.ai_tag === 's20' || email.triage_category === 's20';
        break;
      case 'insurance':
        folderMatch = email.ai_tag === 'insurance' || email.triage_category === 'insurance';
        break;
      case 'leaks':
        folderMatch = email.ai_tag === 'leak' || email.triage_category === 'leak';
        break;
      case 'drafts':
        // For drafts folder, we'll show emails that have AI-generated drafts
        // This will be handled separately since drafts are in a different table
        folderMatch = false; // We'll filter this differently
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

  const handleEmailSelect = async (email: any) => {
    // Mark as read when email is selected
    if (email && (email.unread || !email.is_read)) {
      await markAsRead(email.id);
    }
    selectEmail(email);
  };

  const handleReply = useCallback((action: 'reply' | 'reply-all' | 'forward') => {
    if (selectedEmail) {
      setReplyEmail(selectedEmail);
      setReplyAction(action);
      setShowReplyModal(true);
    }
  }, [selectedEmail]);

  const handleTriageComplete = (results: any) => {
    // Refresh emails to show new AI tags and categories
    refreshEmails();
    
    // Refresh drafts count
    const fetchDraftsCount = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_generated_drafts')
          .select('id', { count: 'exact' })
          .eq('user_id', user?.id);
        
        if (!error && data) {
          setDraftsCount(data.length);
        }
      } catch (error) {
        console.error('Error fetching drafts count:', error);
      }
    };

    if (user?.id) {
      fetchDraftsCount();
    }
  };

  const handleFolderCreated = () => {
    // Refresh folders after creating a new folder
    refreshEmails();
    setShowCreateFolderModal(false);
  };

  const handleDeleteEmail = useCallback(async (emailId: string) => {
    try {
      console.log('🗑️ Moving email to deleted items:', emailId);
      
      const response = await fetch('/api/delete-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to delete email`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Remove email from current view since it's now in deleted items
        const updatedEmails = safeEmails.filter(email => email.id !== emailId);
        
        // Update the emails state through the hook
        refreshEmails();
        
        // Clear selected email if it was the deleted one
        if (selectedEmail?.id === emailId) {
          selectEmail(null);
        }
        
        toast.success('Email moved to deleted items');
        console.log('✅ Email moved to deleted items successfully');
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('❌ Error deleting email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete email');
    }
  }, [safeEmails, refreshEmails, selectedEmail, selectEmail]);

  const handleEmailDrop = async (emailId: string, folderId: string) => {
    try {
      const response = await fetch('/api/move-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId, folderId }),
      });

      if (!response.ok) {
        throw new Error('Failed to move email');
      }

      toast.success('Email moved successfully');
      
    } catch (error) {
      console.error('Error moving email:', error);
      toast.error('Failed to move email');
    }
  };

  // Keyboard shortcuts support - moved after function definitions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (selectedEmail) {
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault();
            handleReply('reply');
            break;
          case 'a':
            e.preventDefault();
            handleReply('reply-all');
            break;
          case 'f':
            e.preventDefault();
            handleReply('forward');
            break;
          case 'delete':
            e.preventDefault();
            handleDeleteEmail(selectedEmail.id);
            break;
          case 'escape':
            e.preventDefault();
            selectEmail(null);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEmail, handleDeleteEmail, handleReply, selectEmail]);

  // Defensive rendering - wrap the main render in try-catch
  try {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold">📨 Outlook Inbox</h1>
              {safeInboxInfo && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                    {safeInboxInfo.totalCount} total
                  </span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-medium">
                    {safeInboxInfo.unreadCount} unread
                  </span>
                </div>
              )}
              {newEmailCount > 0 && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                  {newEmailCount} new
                </span>
              )}
              {/* Mobile Folder Toggle */}
              <button
                onClick={() => setShowMobileFolders(!showMobileFolders)}
                className="lg:hidden flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <FolderOpen className="h-4 w-4" />
                <span>Folders</span>
              </button>
              {/* AI Triage Button */}
              <button
                onClick={() => setShowTriageModal(true)}
                className="flex items-center gap-2 bg-white border border-red-300 rounded-lg px-3 py-2 text-sm hover:bg-red-50 transition-colors"
              >
                <TriageIcon className="w-5 h-5" />
                <span>AI Triage ({allEmails.length})</span>
              </button>
              

              {/* Compose New Email Button */}
              <button
                onClick={() => setShowComposeModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Email</span>
              </button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="font-medium">Live Outlook</span>
                </div>
              </div>
              {selectedEmail && (
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <span>R: Reply</span>
                  <span>A: Reply All</span>
                  <span>F: Forward</span>
                  <span>Del: Delete</span>
                  <span>Esc: Deselect</span>
                </div>
              )}
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
                {syncing ? 'Syncing...' : 'Refresh Outlook'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">
                  {error === 'Outlook not connected' ? 'Outlook Connection Required' : 'Error loading emails'}
                </h3>
                <p className="text-sm text-red-600">
                  {error === 'Outlook not connected' 
                    ? 'Please connect your Outlook account to view emails. Click "Connect Outlook" below to get started.'
                    : error}
                  </p>
                {error === 'Outlook not connected' && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/connect-outlook', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                          if (result.connected) {
                            toast.success(`Already connected to ${result.email}`);
                          } else if (result.authUrl) {
                            window.open(result.authUrl, '_blank', 'width=600,height=700');
                            toast.success('Opening Microsoft login...');
                          }
                        } else {
                          toast.error(result.message || 'Failed to connect Outlook');
                        }
                      } catch (error) {
                        console.error('Error connecting Outlook:', error);
                        toast.error('Failed to connect Outlook');
                      }
                    }}
                    className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Connect Outlook
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Layout */}
        <div className="grid xl:grid-cols-[280px_400px_1fr] lg:grid-cols-[320px_1fr] grid-cols-1 gap-6 w-full overflow-x-hidden">
          {/* Folder List - Fixed Width */}
          <div className={`w-full xl:w-[280px] lg:w-[320px] ${showMobileFolders ? 'block' : 'hidden'} lg:block`}>
            <SimpleFolderSidebar 
              selectedFolder={selectedFolder}
              onFolderSelect={(folderId) => {
                handleFolderSelect(folderId);
                setShowMobileFolders(false); // Close mobile folders after selection
              }}
              onEmailDrop={handleEmailDrop}
            />
          </div>

          {/* Email List Column - Fixed Width on Desktop */}
          <div className="flex flex-col gap-4 w-full xl:w-[400px] lg:w-full">
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
                <span className="text-sm text-gray-500 hidden lg:block">
                  {filteredEmails.length} of {safeEmails.length} emails
                </span>
              )}
            </div>

            {/* Email List */}
            <div className="bg-white rounded-xl shadow p-4 overflow-y-auto max-h-[calc(100vh-220px)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-gray-500">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Loading emails from Outlook...</span>
                  </div>
                </div>
              ) : filteredEmails.length > 0 ? (
                <ul className="space-y-3">
                  {filteredEmails.map((email) => (
                    <li
                      key={email.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('emailId', email.id);
                      }}
                      onClick={() => handleEmailSelect(email)}
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
                          {email.triage_category && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {email.triage_category}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {search ? 'No emails match your search.' : `No emails in ${selectedFolder} from Outlook.`}
                </div>
              )}
            </div>
          </div>

          {/* Email Detail Panel - Flexible Width */}
          <div className="bg-white rounded-xl shadow p-6 min-h-[300px] flex-1 min-w-[700px] max-w-[1200px] overflow-y-auto hidden lg:block">
            {selectedEmail ? (
              <EnhancedEmailDetailView 
                email={selectedEmail}
                onMarkAsRead={markAsRead}
                onMarkAsHandled={markAsHandled}
                onFlagEmail={flagEmail}
                onReply={handleReply}
                onDelete={handleDeleteEmail}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-gray-500 h-full">
                <div className="text-4xl mb-2">📥</div>
                <h2 className="text-lg font-semibold">Select an email</h2>
                <p className="text-sm text-gray-400">
                  Choose an email from your Outlook inbox to view its details and generate AI-powered replies.
                </p>
              </div>
            )}
          </div>

          {/* Mobile Email Detail Panel */}
          {selectedEmail && (
            <div className="lg:hidden bg-white rounded-xl shadow p-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Email Details</h3>
                <button
                  onClick={() => selectEmail(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <EnhancedEmailDetailView 
                email={selectedEmail}
                onMarkAsRead={markAsRead}
                onMarkAsHandled={markAsHandled}
                onFlagEmail={flagEmail}
                onReply={handleReply}
                onDelete={handleDeleteEmail}
              />
            </div>
          )}
        </div>

        {/* AI Triage Modal */}
        <TriageModal
          isOpen={showTriageModal}
          onClose={() => setShowTriageModal(false)}
          unreadEmails={allEmails}
          onTriageComplete={handleTriageComplete}
        />

        {/* Compose Email Modal */}
        <ComposeEmailModal
          isOpen={showComposeModal}
          onClose={() => setShowComposeModal(false)}
        />

        {/* Reply Modal */}
        <ReplyModal
          isOpen={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          email={replyEmail}
          action={replyAction}
        />

        {/* Create Folder Modal */}
        <CreateFolderModal
          isOpen={showCreateFolderModal}
          onClose={() => setShowCreateFolderModal(false)}
          onFolderCreated={handleFolderCreated}
        />

        {/* Floating Action Button for Mobile */}
        <button
          onClick={() => setShowComposeModal(true)}
          className="fixed bottom-6 right-6 lg:hidden bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-colors z-50"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    );
  } catch (renderError) {
    // Defensive error boundary - catch any rendering errors
    console.error('InboxClient render error:', renderError);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to render inbox</h2>
          <p className="text-gray-600 mb-4">Please refresh the page to try again</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
} 