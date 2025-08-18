"use client"

import { useState, createContext, useContext, useEffect, useCallback } from 'react'
import { MessageSquare } from 'lucide-react'
import FolderSidebar from '@/components/inbox_v2/FolderSidebar'
import MessageList from '@/components/inbox_v2/MessageList'
import MessagePreview from '@/components/inbox_v2/MessagePreview'
import ReplyModal from '@/components/inbox_v2/ReplyModal'
import NewEmailModal from '@/components/inbox_v2/NewEmailModal'
import DragDropFrame from '@/components/inbox_v2/DragDropFrame'
import TriageButton from '@/components/inbox_v2/TriageButton'
import { useMessages, useFolders } from '@/hooks/inbox_v2'
import { mutate } from 'swr'

// Context for inbox state
interface InboxContextType {
  selectedFolderId: string | null
  selectedMessage: any | null
  setSelectedFolderId: (folderId: string) => void
  setSelectedMessage: (message: any) => void
  moveMessage: (messageId: string, destinationFolderId: string) => Promise<void>
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

  // Clear success message after 3 seconds
  useEffect(() => {
    if (moveSuccess) {
      const timer = setTimeout(() => {
        setMoveSuccess(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [moveSuccess])

  // Global keyboard shortcuts for inbox
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLDivElement && e.target.contentEditable === 'true') {
        return
      }

      switch (e.key) {
        case 'Delete':
          if (selectedMessage) {
            e.preventDefault()
            handleDeleteMessage(selectedMessage.id)
          }
          break
        case 'Escape':
          if (replyModal.isOpen) {
            e.preventDefault()
            handleCloseReplyModal()
          } else if (newEmailModalOpen) {
            e.preventDefault()
            setNewEmailModalOpen(false)
          }
          break
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [selectedMessage, replyModal.isOpen, newEmailModalOpen])

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

  const moveMessage = async (messageId: string, destinationFolderId: string) => {
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
          const successMessage = `✅ Successfully moved "${subject}" to folder ${destinationFolderId}`
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Inbox]', successMessage)
          }
          
          // Set success state for UI feedback
          setMoveSuccess({ message: successMessage, timestamp: Date.now() })
          
          // Clear success message after 3 seconds
          setTimeout(() => setMoveSuccess(null), 3000)
          
          // Immediately invalidate all message caches to ensure consistency across folders
          // This will update both the source and destination folders
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Inbox] Invalidating all message caches...')
          }
          
          // Invalidate all message list caches with more specific pattern matching
          const cacheKeys = await mutate((key: string) => {
            const isMessageList = key.includes('/api/outlook/v2/messages/list')
            if (process.env.NODE_ENV === 'development') {
              console.debug('[Inbox] Checking cache key:', key, 'isMessageList:', isMessageList)
            }
            return isMessageList
          })
          
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Inbox] Cache invalidation result:', cacheKeys)
          }
          
          // Also try to manually clear specific caches for better reliability
          try {
            // Clear the current folder's cache specifically
            const currentFolderKey = `/api/outlook/v2/messages/list?folderId=${selectedFolderId}`
            if (process.env.NODE_ENV === 'development') {
              console.debug('[Inbox] Manually clearing current folder cache:', currentFolderKey)
            }
            await mutate(currentFolderKey, undefined, false)
            
            // Clear the destination folder's cache if it's different
            if (destinationFolderId !== selectedFolderId) {
              const destFolderKey = `/api/outlook/v2/messages/list?folderId=${destinationFolderId}`
              if (process.env.NODE_ENV === 'development') {
                console.debug('[Inbox] Manually clearing destination folder cache:', destFolderKey)
              }
              await mutate(destFolderKey, undefined, false)
            }
          } catch (cacheError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[Inbox] Cache clearing warning:', cacheError)
            }
          }
          
          // Force refresh the current folder to show the updated message list
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Inbox] Refreshing current folder messages...')
          }
          await refreshMessages()
          
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Inbox] Message move completed successfully')
          }
        } else {
          console.error('Failed to move message:', data.error)
        }
      } else {
        console.error('Failed to move message')
      }
    } catch (error) {
      console.error('Error moving message:', error)
    }
  }

  const contextValue: InboxContextType = {
    selectedFolderId,
    selectedMessage,
    setSelectedFolderId,
    setSelectedMessage,
    moveMessage
  }

  const handleReply = (type: 'reply' | 'replyAll') => {
    setReplyModal({ isOpen: true, type })
  }

  const handleCloseReplyModal = () => {
    setReplyModal({ isOpen: false, type: 'reply' })
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
        // If message not found, only clear selection if we don't have a current selection
        // This prevents the preview from disappearing when messages are filtered
        if (!selectedMessage || selectedMessage.id !== messageId) {
          setSelectedMessage(null)
          setSelectedId(null)
        }
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

  return (
    <InboxContext.Provider value={contextValue}>
      {/* Hero Banner - Matching Home Page and Buildings Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <MessageSquare className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Email Inbox
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Manage your communications, organize emails into folders, and stay on top of important messages.
            </p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      <DragDropFrame onMoveSuccess={handleMoveSuccess} onMoveError={handleMoveError}>
        <div className="grid grid-cols-[260px_380px_1fr] gap-4 h-[calc(100vh-400px)]">
          <div className="flex flex-col">
            {/* New Email and Triage Buttons */}
            <div className="mb-4 flex gap-3">
              <button
                onClick={() => setNewEmailModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-lg hover:brightness-110 transition-all duration-200 shadow-sm font-medium"
              >
                <MessageSquare className="h-4 w-4" />
                New Email
              </button>
              
              <TriageButton 
                selectedMessageId={selectedId}
                onTriage={triageMessage}
                onBulkTriage={async () => {}} // This was causing a linter error, removing it
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
            </div>
            
            <FolderSidebar 
              selectedFolderId={selectedFolderId}
              onFolderSelect={(folderId) => {
                setSelectedFolderId(folderId)
                setSelectedMessage(null) // Clear selected message when changing folders
                setSelectedId(null)
              }}
            />
          </div>
          
          <MessageList 
            selectedFolderId={selectedFolderId}
            selectedMessageId={selectedId}
            onMessageSelect={handleMessageSelect}
          />
          
          <MessagePreview 
            selectedMessage={selectedMessage}
            onReply={() => handleReply('reply')}
            onReplyAll={() => handleReply('replyAll')}
            onMessageUpdate={refreshMessages}
            triageResult={triage}
          />
        </div>
      </DragDropFrame>

      {/* Success Message Display */}
      {moveSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-2">
          {moveSuccess.message}
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
    </InboxContext.Provider>
  )
}
