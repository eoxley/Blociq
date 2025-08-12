"use client"

import { useState, createContext, useContext } from 'react'
import FolderSidebar from '@/components/inbox_v2/FolderSidebar'
import MessageList from '@/components/inbox_v2/MessageList'
import MessagePreview from '@/components/inbox_v2/MessagePreview'
import ReplyModal from '@/components/inbox_v2/ReplyModal'
import { useMessages } from '@/hooks/inbox_v2'

// Context for inbox state
interface InboxContextType {
  selectedFolderId: string | null
  selectedMessage: any | null
  setSelectedFolderId: (folderId: string) => void
  setSelectedMessage: (message: any) => void
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

  // Get messages for the selected folder to find the selected message
  const { messages } = useMessages(selectedFolderId)

  const contextValue: InboxContextType = {
    selectedFolderId,
    selectedMessage,
    setSelectedFolderId,
    setSelectedMessage
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
      <div className="grid grid-cols-[260px_1fr_420px] gap-4 h-[calc(100vh-260px)]">
        <FolderSidebar 
          selectedFolderId={selectedFolderId}
          onFolderSelect={(folderId) => {
            setSelectedFolderId(folderId)
            setSelectedMessage(null) // Clear selected message when changing folders
          }}
        />
        
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
    </InboxContext.Provider>
  )
}
