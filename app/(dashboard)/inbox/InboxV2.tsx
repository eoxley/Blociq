"use client"

import { useState, createContext, useContext, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, Search, Filter, RefreshCw, Settings, MoreVertical, FileText, Sparkles, Zap, TrendingUp, Users, Clock } from 'lucide-react'
import FolderSidebar from '@/components/inbox_v2/FolderSidebar'
import MessageList from '@/components/inbox_v2/MessageList'
import MessagePreview from '@/components/inbox_v2/MessagePreview'
import ReplyModal from '@/components/inbox_v2/ReplyModal'
import NewEmailModal from '@/components/inbox_v2/NewEmailModal'
import TriageButton from '@/components/inbox_v2/TriageButton'
import AskBlocIQButton from '@/components/inbox_v2/AskBlocIQButton'
import DraftsPanel from '@/components/inbox_v2/DraftsPanel'
import { useMessages, useFolders } from '@/hooks/inbox_v2'
import { mutate } from 'swr'
import { cn } from '@/lib/utils'

// Context for inbox state
interface InboxContextType {
  selectedFolderId: string | null
  selectedMessage: any | null
  setSelectedFolderId: (folderId: string) => void
  setSelectedMessage: (message: any) => void
  moveMessage: (messageId: string, destinationFolderId: string) => Promise<boolean>
}

const InboxContext = createContext<InboxContextType | undefined>(undefined)

export function useInboxContext() {
  const context = useContext(InboxContext)
  if (!context) {
    throw new Error('useInboxContext must be used within InboxV2')
  }
  return context
}

export default function InboxV2() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null)
  const [replyModal, setReplyModal] = useState<{
    isOpen: boolean
    type: 'reply' | 'replyAll'
  }>({ isOpen: false, type: 'reply' })
  const [newEmailModalOpen, setNewEmailModalOpen] = useState(false)
  const [moveSuccess, setMoveSuccess] = useState<{ message: string; timestamp: number } | null>(null)
  const [triageSuccess, setTriageSuccess] = useState<{ message: string; timestamp: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [draggedMessage, setDraggedMessage] = useState<{ messageId: string; sourceFolderId: string } | null>(null)
  const [isMovingMessage, setIsMovingMessage] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [draftsPanelOpen, setDraftsPanelOpen] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())

  // Get folders and messages with enhanced data fetching
  const { folders, isLoading: foldersLoading, isFallback } = useFolders()
  const { 
    messages, 
    selectedId, 
    setSelectedId, 
    triage, 
    isTriaging, 
    error: triageError,
    triageMessage,
    refresh: refreshMessages 
  } = useMessages(selectedFolderId)

  // Enhanced refresh function with timestamp update
  const handleRefresh = useCallback(async () => {
    setLastRefreshTime(new Date())
    await refreshMessages()
  }, [refreshMessages])

  // Set the inbox folder as default when folders are loaded
  useEffect(() => {
    if (folders.length > 0 && !selectedFolderId) {
      // Find the inbox folder (either from Graph API or default folders)
      const inboxFolder = folders.find(folder => 
        folder.wellKnownName === 'inbox' || 
        folder.displayName.toLowerCase() === 'inbox'
      )
      if (inboxFolder) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Inbox] Setting inbox folder ID:', inboxFolder.id, 'for folder:', inboxFolder.displayName)
        }
        setSelectedFolderId(inboxFolder.id)
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Inbox] No inbox folder found in:', folders)
        }
      }
    }
  }, [folders, selectedFolderId])

  // Debug logging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Inbox] Folders loaded:', folders.length, 'Selected folder ID:', selectedFolderId)
    }
  }, [folders, selectedFolderId])

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Inbox] Messages loaded:', messages.length, 'for folder:', selectedFolderId)
    }
    
    // Clear selected message if it's no longer in the current message list
    if (selectedMessage && messages.length > 0) {
      const messageStillExists = messages.some((msg: any) => msg.id === selectedMessage.id)
      if (!messageStillExists) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Inbox] Selected message no longer exists in current list, clearing selection')
        }
        setSelectedMessage(null)
      }
    }
  }, [messages, selectedFolderId, selectedMessage])

  // Sync selectedId with selectedMessage
  useEffect(() => {
    if (selectedId && selectedId !== selectedMessage?.id) {
      const message = messages.find((msg: any) => msg.id === selectedId)
      if (message) {
        setSelectedMessage(message)
      }
    }
  }, [selectedId, selectedMessage, messages])

  // Clear success message after appropriate time
  useEffect(() => {
    if (moveSuccess) {
      const isError = moveSuccess.message.includes('❌')
      const isLoading = moveSuccess.message.includes('⏳')
      
      // Don't auto-clear loading messages
      if (!isLoading) {
        const timer = setTimeout(() => {
          setMoveSuccess(null)
        }, isError ? 5000 : 3000) // Error messages stay longer
        
        return () => clearTimeout(timer)
      }
    }
  }, [moveSuccess])

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    
    try {
      const response = await fetch(`/api/outlook/v2/messages/${messageId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Clear selected message
        setSelectedMessage(null)
        setSelectedId(null)
        // Refresh messages
        handleRefresh()
      } else {
        console.error('Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const handleDeleteMultiple = async (messageIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${messageIds.length} message${messageIds.length !== 1 ? 's' : ''}?`)) return
    
    try {
      // Delete messages in parallel
      const deletePromises = messageIds.map(messageId => 
        fetch(`/api/outlook/v2/messages/${messageId}`, { method: 'DELETE' })
      )
      
      const responses = await Promise.all(deletePromises)
      const allSuccessful = responses.every(response => response.ok)
      
      if (allSuccessful) {
        // Clear selected messages and refresh
        setSelectedMessages(new Set())
        if (selectedMessage && messageIds.includes(selectedMessage.id)) {
          setSelectedMessage(null)
          setSelectedId(null)
        }
        handleRefresh()
      } else {
        console.error('Some messages failed to delete')
      }
    } catch (error) {
      console.error('Error deleting messages:', error)
    }
  }

  const handleReply = (type: 'reply' | 'replyAll') => {
    setReplyModal({ isOpen: true, type })
  }

  const handleCloseReplyModal = () => {
    setReplyModal({ isOpen: false, type: 'reply' })
  }

  // Global keyboard shortcuts for inbox
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLDivElement && e.target.contentEditable === 'true') {
        return
      }

      // Refresh with F5 or Ctrl+R
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault()
        handleRefresh()
      }

      // New email with Ctrl+N
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        setNewEmailModalOpen(true)
      }

      // Triage with Ctrl+T
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault()
        if (selectedId) {
          triageMessage(selectedId)
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleRefresh, selectedId, triageMessage])

  const handleMessageSelect = useCallback((message: any) => {
    setSelectedMessage(message)
    setSelectedId(message.id)
  }, [])

  const moveMessage = useCallback(async (messageId: string, destinationFolderId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/outlook/v2/messages/${messageId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinationFolderId
        })
      })

      if (response.ok) {
        // Refresh messages to get updated state
        handleRefresh()
        return true
      } else {
        console.error('Failed to move message')
        return false
      }
    } catch (error) {
      console.error('Error moving message:', error)
      return false
    }
  }, [handleRefresh])

  const contextValue: InboxContextType = {
    selectedFolderId,
    selectedMessage,
    setSelectedFolderId,
    setSelectedMessage,
    moveMessage
  }

  const handleDragStart = useCallback((e: React.DragEvent, messageId: string, sourceFolderId: string) => {
    setDraggedMessage({ messageId, sourceFolderId })
    e.dataTransfer.effectAllowed = 'move'
    
    // Create a custom drag image
    const dragImage = document.createElement('div')
    dragImage.innerHTML = '📧 Moving email...'
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.left = '-1000px'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    
    // Clean up after drag starts
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, destinationFolderId: string) => {
    e.preventDefault()
    
    if (!draggedMessage) return
    
    const { messageId, sourceFolderId } = draggedMessage
    
    // Don't move to the same folder
    if (destinationFolderId === sourceFolderId) {
      setDraggedMessage(null)
      return
    }

    try {
      // Show loading state
      setMoveSuccess({ message: '⏳ Moving email...', timestamp: Date.now() })
      
      // Move the message
      const success = await moveMessage(messageId, destinationFolderId)
      
      if (success) {
        // Show success message
        setMoveSuccess({ message: '✅ Email moved successfully!', timestamp: Date.now() })
      } else {
        // Show error message
        setMoveSuccess({ message: '❌ Failed to move email', timestamp: Date.now() })
      }
    } catch (error) {
      // Show error message
      setMoveSuccess({ message: '❌ Failed to move email', timestamp: Date.now() })
      console.error('Error moving message:', error)
    } finally {
      setDraggedMessage(null)
    }
  }, [draggedMessage, moveMessage])

  // Calculate enhanced statistics
  const unreadCount = messages.filter((message: any) => !message.isRead).length
  const selectedFolder = folders.find(f => f.id === selectedFolderId)
  const totalMessages = messages.length
  const urgentMessages = messages.filter((message: any) => 
    message.importance === 'high' || 
    message.subject?.toLowerCase().includes('urgent') ||
    message.subject?.toLowerCase().includes('asap')
  ).length

  return (
    <InboxContext.Provider value={contextValue}>
      {/* Enhanced Modern Email Client Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] rounded-2xl flex items-center justify-center shadow-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              {/* Floating sparkles */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#4f46e5] to-[#a855f7] bg-clip-text text-transparent">
                Inbox
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {selectedFolder ? selectedFolder.displayName : 'Loading...'} • {totalMessages} messages
                </p>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {unreadCount} unread
                  </span>
                )}
                {urgentMessages > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                    <Zap className="h-3 w-3 mr-1" />
                    {urgentMessages} urgent
                  </span>
                )}
                {isMovingMessage && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    Moving...
                  </span>
                )}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Last updated: {lastRefreshTime.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewEmailModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-xl hover:from-[#4338ca] hover:to-[#6d28d9] transition-all duration-200 shadow-lg hover:shadow-xl font-medium transform hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              New Email
            </button>
            
            <button
              onClick={() => setDraftsPanelOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium transform hover:scale-105"
            >
              <FileText className="h-5 w-5" />
              AI Drafts
            </button>
            
            <TriageButton 
              selectedMessageId={selectedId}
              onTriage={triageMessage}
              onBulkTriage={async () => {}}
              isTriaging={isTriaging}
              triageResult={triage}
              triageError={triageError}
              onTriageSuccess={(result) => {
                let message = ''
                if (result.summary && result.summary.includes('Processed')) {
                  // Bulk triage result
                  message = `✅ ${result.summary} Please review your draft replies in Outlook.`
                } else {
                  // Single triage result
                  message = `✅ AI Triage completed! Email categorized as "${result.category}". Check your Outlook for draft replies and categories.`
                }
                
                setTriageSuccess({ 
                  message,
                  timestamp: Date.now() 
                })
                // Clear success message after 5 seconds
                setTimeout(() => setTriageSuccess(null), 5000)
              }}
            />
            
            <button
              onClick={handleRefresh}
              disabled={foldersLoading}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              title="Refresh (F5)"
            >
              <RefreshCw className={`h-5 w-5 ${foldersLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110" title="Settings">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Main Email Client Layout */}
      <div className="flex h-[calc(100vh-180px)] bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Left Column: Enhanced Folder Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-b from-gray-50/50 to-white">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Folders
            </h3>
            <FolderSidebar 
              selectedFolderId={selectedFolderId}
              onFolderSelect={(folderId) => {
                setSelectedFolderId(folderId)
                setSelectedMessage(null) // Clear selected message when changing folders
                setSelectedId(null)
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
          </div>
        </div>

        {/* Middle Column: Enhanced Message List */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col shadow-sm">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-b from-gray-50/50 to-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent shadow-sm transition-all duration-200"
                />
              </div>
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  showUnreadOnly 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent'
                }`}
                title="Show unread only"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <MessageList 
              selectedFolderId={selectedFolderId}
              selectedMessageId={selectedId}
              onMessageSelect={handleMessageSelect}
              searchQuery={searchQuery}
              showUnreadOnly={showUnreadOnly}
              onDragStart={handleDragStart}
              selectedMessages={selectedMessages}
              setSelectedMessages={setSelectedMessages}
              onDelete={handleDeleteMultiple}
            />
          </div>
        </div>

        {/* Right Column: Enhanced Message Preview */}
        <div className="flex-1 bg-white flex flex-col shadow-sm">
          {selectedMessage ? (
            <MessagePreview 
              selectedMessage={selectedMessage}
              onReply={() => handleReply('reply')}
              onReplyAll={() => handleReply('replyAll')}
              onMessageUpdate={handleRefresh}
              triageResult={triage}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center">
                <div className="relative mb-6">
                  <MessageSquare className="h-20 w-20 text-gray-300 mx-auto" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">No message selected</h3>
                <p className="text-gray-500 mb-4">Select a message from the list to preview it here</p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Use the AskBlocIQ AI button for assistance</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Success/Error Message Display */}
      {moveSuccess && (
        <div className={cn(
          "fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-2 transition-all duration-300 border",
          moveSuccess.message.includes('✅') ? 'bg-green-500 text-white border-green-400' : 
          moveSuccess.message.includes('❌') ? 'bg-red-500 text-white border-red-400' : 
          'bg-blue-500 text-white border-blue-400'
        )}>
          <div className="flex items-center gap-3">
            {moveSuccess.message.includes('✅') && <span className="text-xl">✅</span>}
            {moveSuccess.message.includes('❌') && <span className="text-xl">❌</span>}
            {!moveSuccess.message.includes('✅') && !moveSuccess.message.includes('❌') && <span className="text-xl">⏳</span>}
            <span className="font-medium">{moveSuccess.message}</span>
          </div>
        </div>
      )}

      {triageSuccess && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-2 border border-green-400">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">{triageSuccess.message}</span>
          </div>
        </div>
      )}

      <ReplyModal
        isOpen={replyModal.isOpen}
        onClose={handleCloseReplyModal}
        message={selectedMessage}
        replyType={replyModal.type}
      />
      
      <NewEmailModal
        isOpen={newEmailModalOpen}
        onClose={() => setNewEmailModalOpen(false)}
      />

      {/* Enhanced Ask BlocIQ AI Assistant */}
      <AskBlocIQButton selectedMessage={selectedMessage} />

      {/* AI Drafts Panel */}
      <DraftsPanel
        isOpen={draftsPanelOpen}
        onClose={() => setDraftsPanelOpen(false)}
        onEditDraft={(draft) => {
          // TODO: Implement draft editing functionality
          console.log('Edit draft:', draft)
          setDraftsPanelOpen(false)
        }}
        onSendDraft={(draft) => {
          // TODO: Implement draft sending functionality
          console.log('Send draft:', draft)
          setDraftsPanelOpen(false)
        }}
      />
    </InboxContext.Provider>
  )
}
