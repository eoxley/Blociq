"use client"

import { useState, createContext, useContext, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, Search, Filter, RefreshCw, Settings, MoreVertical } from 'lucide-react'
import FolderSidebar from '@/components/inbox_v2/FolderSidebar'
import MessageList from '@/components/inbox_v2/MessageList'
import MessagePreview from '@/components/inbox_v2/MessagePreview'
import ReplyModal from '@/components/inbox_v2/ReplyModal'
import NewEmailModal from '@/components/inbox_v2/NewEmailModal'
import TriageButton from '@/components/inbox_v2/TriageButton'
import AskBlocIQButton from '@/components/inbox_v2/AskBlocIQButton'
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

  // Get folders and messages
  const { folders, isLoading: foldersLoading } = useFolders()
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
        refreshMessages()
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
        refreshMessages()
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

      // If reply modal is open, only handle Escape key, disable all other shortcuts
      if (replyModal.isOpen) {
        if (e.key === 'Escape') {
          e.preventDefault()
          handleCloseReplyModal()
        }
        // Prevent all other keyboard shortcuts when modal is open
        e.preventDefault()
        return
      }

      switch (e.key) {
        case 'Delete':
          // Check if we have selected messages in the message list first
          if (selectedMessages && selectedMessages.size > 0) {
            e.preventDefault()
            // Delete all selected messages
            handleDeleteMultiple(Array.from(selectedMessages))
          } else if (selectedMessage) {
            // Fallback to deleting the selected message preview
            e.preventDefault()
            handleDeleteMessage(selectedMessage.id)
          }
          break
        case 'Escape':
          if (newEmailModalOpen) {
            e.preventDefault()
            setNewEmailModalOpen(false)
          }
          break
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [selectedMessage, selectedMessages, replyModal.isOpen, newEmailModalOpen, handleDeleteMultiple, handleDeleteMessage, handleCloseReplyModal])

  const moveMessage = async (messageId: string, destinationFolderId: string) => {
    setIsMovingMessage(true)
    try {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Inbox] Moving message ${messageId} to folder ${destinationFolderId}`)
      }
      
      const response = await fetch('/api/outlook/v2/messages/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          destinationFolderId
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.ok) {
          // Clear selected message if it was moved
          if (selectedMessage?.id === messageId) {
            setSelectedMessage(null)
            setSelectedId(null)
          }

          // Show success message
          const message = messages.find((msg: any) => msg.id === messageId)
          const subject = message?.subject || 'Message'
          const destinationFolder = folders.find(f => f.id === destinationFolderId)
          const folderName = destinationFolder?.displayName || destinationFolderId
          
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[Inbox] Successfully moved "${subject}" to folder ${folderName}`)
          }
          
          // Immediately invalidate relevant caches for better reliability
          try {
            // Clear the current folder's cache
            if (selectedFolderId) {
              const currentFolderKey = `/api/outlook/v2/messages/list?folderId=${selectedFolderId}`
              await mutate(currentFolderKey, undefined, false)
            }
            
            // Clear the destination folder's cache if it's different
            if (destinationFolderId !== selectedFolderId) {
              const destFolderKey = `/api/outlook/v2/messages/list?folderId=${destinationFolderId}`
              await mutate(destFolderKey, undefined, false)
            }
            
            // Refresh the current folder to show updated state
            await refreshMessages()
            
          } catch (cacheError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[Inbox] Cache clearing warning:', cacheError)
            }
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Inbox] Message move completed successfully')
          }
          
          return true
        } else {
          throw new Error(data.error || 'Failed to move message')
        }
      } else {
        throw new Error('Failed to move message')
      }
    } catch (error) {
      console.error('Error moving message:', error)
      throw error
    } finally {
      setIsMovingMessage(false)
    }
  }

  const contextValue: InboxContextType = {
    selectedFolderId,
    selectedMessage,
    setSelectedFolderId,
    setSelectedMessage,
    moveMessage
  }

  const handleMessageSelect = (messageId: string | null) => {
    if (messageId === null) {
      setSelectedMessage(null)
      setSelectedId(null)
    } else {
      // Find message in current messages
      const message = messages.find((msg: any) => msg.id === messageId)
      if (message) {
        setSelectedMessage(message)
        setSelectedId(messageId)
      } else {
        // If message not found, clear selection
        setSelectedMessage(null)
        setSelectedId(null)
      }
    }
  }

  const handleMoveSuccess = useCallback(async (messageId: string, destinationFolderId: string) => {
    console.log('Message move success:', { messageId, destinationFolderId })
    
    // Update the move success state
    setMoveSuccess({ 
      message: `✅ Email moved to ${destinationFolderId}`, 
      timestamp: Date.now() 
    })
    
    // Clear success message after 3 seconds
    setTimeout(() => setMoveSuccess(null), 3000)
    
    // Refresh messages in the current folder to show updated state
    if (refreshMessages) {
      refreshMessages()
    }
    
    // If the moved message was selected, clear the selection
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null)
      setSelectedId(null)
    }
  }, [selectedMessage, selectedId, refreshMessages])

  const handleMoveError = useCallback((messageId: string, error: string) => {
    console.error('Message move error:', { messageId, error })
    
    // Show error message
    setMoveSuccess({ 
      message: `❌ Failed to move email: ${error}`, 
      timestamp: Date.now() 
    })
    
    // Clear error message after 5 seconds
    setTimeout(() => setMoveSuccess(null), 5000)
    
    // Refresh messages to restore the original state
    if (refreshMessages) {
      refreshMessages()
    }
  }, [refreshMessages])

  // Enhanced drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, messageId: string, sourceFolderId: string) => {
    setDraggedMessage({ messageId, sourceFolderId })
    e.dataTransfer.effectAllowed = 'move'
    
    // Add visual feedback
    if (e.dataTransfer.setDragImage) {
      const dragImage = document.createElement('div')
      dragImage.textContent = 'Moving email...'
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-1000px'
      dragImage.style.left = '-1000px'
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 0, 0)
      
      // Clean up after drag starts
      setTimeout(() => document.body.removeChild(dragImage), 0)
    }
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

  // Calculate unread count
  const unreadCount = messages.filter((message: any) => !message.isRead).length
  const selectedFolder = folders.find(f => f.id === selectedFolderId)

  return (
    <InboxContext.Provider value={contextValue}>
      {/* Modern Email Client Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
              <p className="text-sm text-gray-600">
                {selectedFolder ? selectedFolder.displayName : 'Loading...'} • {messages.length} messages
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {unreadCount} unread
                  </span>
                )}
                {isMovingMessage && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    Moving...
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewEmailModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-lg hover:brightness-110 transition-all duration-200 shadow-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New Email
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
              onClick={() => refreshMessages()}
              disabled={foldersLoading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${foldersLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200" title="Settings">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Email Client Layout */}
      <div className="flex h-[calc(100vh-120px)] bg-gray-50">
        {/* Left Column: Folder Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Folders</h3>
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

        {/* Middle Column: Message List */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showUnreadOnly 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
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

        {/* Right Column: Message Preview */}
        <div className="flex-1 bg-white flex flex-col">
          {selectedMessage ? (
            <MessagePreview 
              selectedMessage={selectedMessage}
              onReply={() => handleReply('reply')}
              onReplyAll={() => handleReply('replyAll')}
              onMessageUpdate={refreshMessages}
              triageResult={triage}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No message selected</h3>
                <p className="text-gray-500">Select a message from the list to preview it here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Success/Error Message Display */}
      {moveSuccess && (
        <div className={cn(
          "fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-2 transition-all duration-300",
          moveSuccess.message.includes('✅') ? 'bg-green-500 text-white' : 
          moveSuccess.message.includes('❌') ? 'bg-red-500 text-white' : 
          'bg-blue-500 text-white'
        )}>
          <div className="flex items-center gap-2">
            {moveSuccess.message.includes('✅') && <span>✅</span>}
            {moveSuccess.message.includes('❌') && <span>❌</span>}
            {!moveSuccess.message.includes('✅') && !moveSuccess.message.includes('❌') && <span>⏳</span>}
            <span className="font-medium">{moveSuccess.message}</span>
          </div>
        </div>
      )}

      {triageSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-2">
          {triageSuccess.message}
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

      {/* Ask BlocIQ AI Assistant */}
      <AskBlocIQButton selectedMessage={selectedMessage} />
    </InboxContext.Provider>
  )
}
