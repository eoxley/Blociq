"use client"

import { useState, createContext, useContext, useEffect } from 'react'
import { MessageSquare, X } from 'lucide-react'
import FolderSidebar from '@/components/inbox_v2/FolderSidebar'
import MessageList from '@/components/inbox_v2/MessageList'
import MessagePreview from '@/components/inbox_v2/MessagePreview'
import ReplyModal from '@/components/inbox_v2/ReplyModal'
import NewEmailModal from '@/components/inbox_v2/NewEmailModal'
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

  // Get folders and messages
  const { folders, isLoading: foldersLoading } = useFolders()
  const { messages, refresh: refreshMessages } = useMessages(selectedFolderId)

  // Set the inbox folder as default when folders are loaded
  useEffect(() => {
    if (folders.length > 0 && !selectedFolderId) {
      // Find the inbox folder (either from Graph API or default folders)
      const inboxFolder = folders.find(folder => 
        folder.wellKnownName === 'inbox' || 
        folder.displayName.toLowerCase() === 'inbox'
      )
      if (inboxFolder) {
        console.log('Setting inbox folder ID:', inboxFolder.id, 'for folder:', inboxFolder.displayName)
        setSelectedFolderId(inboxFolder.id)
      } else {
        console.log('No inbox folder found in:', folders)
      }
    }
  }, [folders, selectedFolderId])

  // Debug logging
  useEffect(() => {
    console.log('Folders loaded:', folders.length, 'Selected folder ID:', selectedFolderId)
  }, [folders, selectedFolderId])

  useEffect(() => {
    console.log('Messages loaded:', messages.length, 'for folder:', selectedFolderId)
  }, [messages, selectedFolderId])

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
          }

          // Show success message
          const message = messages.find((msg: any) => msg.id === messageId)
          const subject = message?.subject || 'Message'
          const successMessage = `✅ Successfully moved "${subject}" to folder ${destinationFolderId}`
          console.log(successMessage)
          
          // Set success state for UI feedback
          setMoveSuccess({ message: successMessage, timestamp: Date.now() })
          
          // Clear success message after 3 seconds
          setTimeout(() => setMoveSuccess(null), 3000)
          
          // Immediately refresh the current folder to remove the moved message
          refreshMessages()
          
          // Invalidate all message caches to ensure consistency across folders
          // This will update both the source and destination folders
          mutate((key: string) => key.startsWith('/api/outlook/v2/messages/list'))
          
          // Also refresh the current folder again to ensure immediate update
          setTimeout(() => {
            refreshMessages()
          }, 100)
          
          // You could add a proper toast notification here
          // For now, we'll use console.log
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
    } else {
      const message = messages.find((msg: any) => msg.id === messageId)
      setSelectedMessage(message || null)
    }
  }

  return (
    <InboxContext.Provider value={contextValue}>
      <div className="grid grid-cols-[260px_1fr_420px] gap-4 h-[calc(100vh-300px)]">
        <div className="flex flex-col">
          {/* New Email and Triage Buttons */}
          <div className="mb-4 flex gap-3">
            <button
              onClick={() => setNewEmailModalOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <MessageSquare className="h-4 w-4" />
              New Email
            </button>
            
            <button
              onClick={() => console.log('Triage functionality coming soon')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-red-400 transition-colors shadow-sm"
              title="Triage - Coming Soon"
            >
              <X className="h-4 w-4 text-red-600" />
              Triage
            </button>
          </div>
          
          <FolderSidebar 
            selectedFolderId={selectedFolderId}
            onFolderSelect={(folderId) => {
              setSelectedFolderId(folderId)
              setSelectedMessage(null) // Clear selected message when changing folders
            }}
          />
        </div>
        
        <MessageList 
          selectedFolderId={selectedFolderId}
          selectedMessageId={selectedMessage?.id || null}
          onMessageSelect={handleMessageSelect}
        />
        
        <MessagePreview 
          selectedMessage={selectedMessage}
          onReply={() => handleReply('reply')}
          onReplyAll={() => handleReply('replyAll')}
        />
      </div>

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
