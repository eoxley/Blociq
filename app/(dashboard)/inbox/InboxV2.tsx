"use client"

import { useState, createContext, useContext } from 'react'
import { MessageSquare, X } from 'lucide-react'
import FolderSidebar from '@/components/inbox_v2/FolderSidebar'
import MessageList from '@/components/inbox_v2/MessageList'
import MessagePreview from '@/components/inbox_v2/MessagePreview'
import ReplyModal from '@/components/inbox_v2/ReplyModal'
import NewEmailModal from '@/components/inbox_v2/NewEmailModal'
import { useMessages } from '@/hooks/inbox_v2'

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
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>('inbox')
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null)
  const [replyModal, setReplyModal] = useState<{
    isOpen: boolean
    type: 'reply' | 'replyAll'
  }>({ isOpen: false, type: 'reply' })
  const [newEmailModalOpen, setNewEmailModalOpen] = useState(false)
  const [moveSuccess, setMoveSuccess] = useState<{ message: string; timestamp: number } | null>(null)

  // Get messages for the selected folder to find the selected message
  const { messages, refresh: refreshMessages } = useMessages(selectedFolderId)

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
          
          // Force a refresh of all message lists to ensure consistency
          // This will update both the source and destination folders
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

  const handleMessageSelect = (messageId: string) => {
    const message = messages.find((msg: any) => msg.id === messageId)
    setSelectedMessage(message || null)
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
