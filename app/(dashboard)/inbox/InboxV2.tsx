"use client"

import { useState, createContext, useContext, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import FolderSidebar from '@/components/inbox_v2/FolderSidebar'
import MessageList from '@/components/inbox_v2/MessageList'
import MessagePreview from '@/components/inbox_v2/MessagePreview'
import ReplyPopout from '@/components/mail/ReplyPopout'
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
  const [replyContent, setReplyContent] = useState('')
  const [newEmailModalOpen, setNewEmailModalOpen] = useState(false)
  const [moveSuccess, setMoveSuccess] = useState<{ message: string; timestamp: number } | null>(null)

  // Get folders and messages
  const { folders, isLoading: foldersLoading, hasGraphError } = useFolders()
  const { messages, refresh: refreshMessages } = useMessages(selectedFolderId)

  // Set the inbox folder as default when folders are loaded
  useEffect(() => {
    if (folders.length > 0 && !selectedFolderId) {
      console.log('Attempting to set default folder from:', folders.length, 'folders')
      
      // Find the inbox folder (either from Graph API or default folders)
      // Prioritize Graph folders over fallback folders
      const inboxFolder = folders.find(folder => 
        (folder.wellKnownName === 'inbox' || folder.displayName.toLowerCase() === 'inbox') &&
        // Prefer Graph folders over fallback folders
        (!folder.isFallback || folders.every(f => f.isFallback))
      )
      
      if (inboxFolder) {
        console.log('Setting inbox folder ID:', inboxFolder.id, 'for folder:', inboxFolder.displayName, 'isGraphFolder:', inboxFolder.isGraphFolder)
        setSelectedFolderId(inboxFolder.id)
      } else {
        console.log('No inbox folder found in:', folders)
        // Fallback: select the first available folder
        if (folders.length > 0) {
          console.log('Falling back to first folder:', folders[0].displayName, 'ID:', folders[0].id)
          setSelectedFolderId(folders[0].id)
        }
      }
    }
  }, [folders, selectedFolderId])

  // Debug logging
  useEffect(() => {
    console.log('Folders loaded:', folders.length, 'Selected folder ID:', selectedFolderId, 'Folders loading:', foldersLoading)
  }, [folders, selectedFolderId, foldersLoading])

  useEffect(() => {
    console.log('Messages loaded:', messages.length, 'for folder:', selectedFolderId)
  }, [messages, selectedFolderId])

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
      console.log(`Moving message ${messageId} to folder ${destinationFolderId}`)
      
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
          
          // Immediately invalidate all message caches to ensure consistency across folders
          // This will update both the source and destination folders
          console.log('Invalidating all message caches...')
          
          // Invalidate all message list caches with more specific pattern matching
          const cacheKeys = await mutate((key: string) => {
            const isMessageList = key.includes('/api/outlook/v2/messages/list')
            console.log('Checking cache key:', key, 'isMessageList:', isMessageList)
            return isMessageList
          })
          
          console.log('Cache invalidation result:', cacheKeys)
          
          // Also try to manually clear specific caches for better reliability
          try {
            // Clear the current folder's cache specifically
            const currentFolderKey = `/api/outlook/v2/messages/list?folderId=${selectedFolderId}`
            console.log('Manually clearing current folder cache:', currentFolderKey)
            await mutate(currentFolderKey, undefined, false)
            
            // Clear the destination folder's cache if it's different
            if (destinationFolderId !== selectedFolderId) {
              const destFolderKey = `/api/outlook/v2/messages/list?folderId=${destinationFolderId}`
              console.log('Manually clearing destination folder cache:', destFolderKey)
              await mutate(destFolderKey, undefined, false)
            }
          } catch (cacheError) {
            console.warn('Cache clearing warning:', cacheError)
          }
          
          // Force refresh the current folder to show the updated message list
          console.log('Refreshing current folder messages...')
          await refreshMessages()
          
          console.log('Message move completed successfully')
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
    setReplyContent('') // Reset content when opening reply modal
  }

  const handleCloseReplyModal = () => {
    setReplyModal({ isOpen: false, type: 'reply' })
  }

  const handleSendEmail = async (payload: any) => {
    if (!selectedMessage) return
    
    try {
      const response = await fetch('/api/outlook/v2/messages/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: selectedMessage.id,
          to: payload.to.map((r: any) => r.email),
          cc: payload.cc.map((r: any) => r.email),
          bcc: payload.bcc.map((r: any) => r.email),
          subject: payload.subject.trim(),
          htmlBody: payload.content.trim()
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.ok) {
        console.log('Reply sent successfully')
        // Optionally refresh messages or show success message
      } else {
        const errorMessage = data?.error || 'Failed to send reply'
        console.error('Failed to send reply:', errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      throw error
    }
  }

  const handleGenerateAIReply = async () => {
    if (!selectedMessage) return
    
    try {
      // Create a prompt for AI reply generation
      const aiPrompt = `Generate a professional email reply to this email:

From: ${selectedMessage.from?.emailAddress?.address || selectedMessage.from?.emailAddress || 'Unknown'}
Subject: ${selectedMessage.subject || '(No subject)'}
Content: ${selectedMessage.body?.content || ''}

Please generate a professional, contextual reply that:
1. Addresses the original sender appropriately
2. Provides a relevant response to the email content
3. Maintains professional tone and formatting
4. Is concise but comprehensive
5. Uses proper email etiquette

Generate the reply in plain text format (no HTML tags).`

      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          context: 'email_reply_generation'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.response) {
          // Clean the AI response and convert to HTML
          let aiReply = data.response.trim()
          
          // Convert plain text to HTML paragraphs
          const paragraphs = aiReply.split('\n').filter((line: string) => line.trim())
          const htmlReply = paragraphs.map((line: string) => `<p>${line}</p>`).join('')
          
          // Update the reply content with the AI-generated response
          setReplyContent(aiReply)
        } else {
          console.error('AI generated an empty response')
        }
      } else {
        console.error('Failed to generate AI reply')
      }
    } catch (error) {
      console.error('Error generating AI reply:', error)
    }
  }

  const transformMessageForReply = (message: any, type: 'reply' | 'replyAll') => {
    if (!message) return { initialTo: [], initialSubject: '', threadMessages: [], fromEmail: '' }
    
    // Set initial recipients based on reply type
    let initialTo: Array<{ name?: string; email: string }> = []
    if (type === 'reply') {
      // Reply to sender only
      const senderEmail = message.from?.emailAddress?.address || message.from?.emailAddress || ''
      if (senderEmail) {
        initialTo = [{ 
          name: message.from?.emailAddress?.name || message.from?.name || undefined,
          email: senderEmail 
        }]
      }
    } else {
      // Reply all - include original recipients
      const originalTo = message.toRecipients?.map((r: any) => ({
        name: r.emailAddress?.name || r.name || undefined,
        email: r.emailAddress?.address || r.emailAddress || ''
      })) || []
      const senderEmail = message.from?.emailAddress?.address || message.from?.emailAddress || ''
      
      // Remove sender from recipients if they're already there
      initialTo = originalTo.filter((r: any) => r.email !== senderEmail)
    }
    
    // Set subject with Re: prefix if not already present
    const currentSubject = message.subject || '(No subject)'
    const initialSubject = currentSubject.startsWith('Re:') ? currentSubject : `Re: ${currentSubject}`
    
    // Transform message to thread format
    const threadMessages = [{
      id: message.id,
      from: {
        name: message.from?.emailAddress?.name || message.from?.name || undefined,
        email: message.from?.emailAddress?.address || message.from?.emailAddress || ''
      },
      to: (message.toRecipients || []).map((r: any) => ({
        name: r.emailAddress?.name || r.name || undefined,
        email: r.emailAddress?.address || r.emailAddress || ''
      })),
      subject: message.subject || '(No subject)',
      date: message.receivedDateTime || new Date().toISOString(),
      snippet: message.body?.content?.substring(0, 100) || '',
      html: message.body?.content || undefined,
      text: message.body?.content || undefined
    }]
    
    // For now, use a placeholder email - in a real app, this would come from user context
    const fromEmail = "user@example.com" // TODO: Get from user context
    
    return { initialTo, initialSubject, threadMessages, fromEmail }
  }

  const handleMessageSelect = (messageId: string | null) => {
    if (messageId === null) {
      setSelectedMessage(null)
    } else {
      const message = messages.find((msg: any) => msg.id === messageId)
      setSelectedMessage(message || null)
    }
  }

  const handleMoveSuccess = (messageId: string, destinationId: string) => {
    // Optimistically remove the message from the current view
    if (messages) {
      const updatedMessages = messages.filter((msg: any) => msg.id !== messageId)
      // Update the SWR cache
      mutate(`/api/outlook/v2/messages/list?folderId=${selectedFolderId}`, { ...messages, items: updatedMessages }, false)
    }
    
    // Clear selection if the moved message was selected
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null)
    }
    
    // Show success message
    setMoveSuccess({ message: `Email moved to ${destinationId}`, timestamp: Date.now() })
  }

  const handleMoveError = (messageId: string, error: string) => {
    // Revert by refreshing the messages
    refreshMessages()
    console.error(`Failed to move message ${messageId}:`, error)
  }

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

      {/* Connection Status Banner */}
      {hasGraphError && (
        <div className="mb-6 mx-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-amber-600 text-lg">⚠️</div>
                <div>
                  <h3 className="text-amber-800 font-medium">Outlook Connection Required</h3>
                  <p className="text-amber-700 text-sm">Connect your Outlook account to access your emails</p>
                </div>
              </div>
              <a
                href="/outlook/connect"
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              >
                Connect Outlook
              </a>
            </div>
          </div>
        </div>
      )}

      <DragDropFrame onMoveSuccess={handleMoveSuccess} onMoveError={handleMoveError}>
        {/* Main Inbox Container - Locked Height with Overflow Hidden */}
        <div className="h-[calc(100vh-400px)] overflow-hidden">
          {/* Show loading state when folders are loading */}
          {foldersLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f46e5] mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg">Loading inbox...</p>
                <p className="text-gray-500 text-sm">Please wait while we connect to your email</p>
              </div>
            </div>
          ) : folders.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No folders available</p>
                <p className="text-gray-500 text-sm mb-4">Unable to load email folders</p>
                <a
                  href="/outlook/connect"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-lg hover:brightness-110 transition-all duration-200 font-medium"
                >
                  <MessageSquare className="h-4 w-4" />
                  Connect Outlook
                </a>
              </div>
            </div>
          ) : !selectedFolderId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Select a folder</p>
                <p className="text-gray-500 text-sm">Choose a folder from the sidebar to view emails</p>
              </div>
            </div>
          ) : (
            /* Grid Layout - All columns now have equal height and proper scroll boxes */
            <div className="grid grid-cols-[260px_380px_1fr] gap-4 h-full">
              {/* Column 1: Folder Sidebar - Fixed height, no scroll needed */}
              <div className="flex flex-col h-full">
                {/* New Email and Triage Buttons */}
                <div className="mb-4 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => setNewEmailModalOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-lg hover:brightness-110 transition-all duration-200 shadow-sm font-medium"
                  >
                    <MessageSquare className="h-4 w-4" />
                    New Email
                  </button>
                  
                  <TriageButton />
                </div>
                
                {/* Folder Sidebar - Takes remaining height */}
                <div className="flex-1 min-h-0">
                  <FolderSidebar 
                    selectedFolderId={selectedFolderId}
                    onFolderSelect={(folderId) => {
                      setSelectedFolderId(folderId)
                      setSelectedMessage(null) // Clear selected message when changing folders
                    }}
                  />
                </div>
              </div>
              
              {/* Column 2: Message List - Full height with scroll box */}
              <div className="h-full min-h-0">
                <MessageList 
                  selectedFolderId={selectedFolderId}
                  selectedMessageId={selectedMessage?.id || null}
                  onMessageSelect={handleMessageSelect}
                />
              </div>
              
              {/* Column 3: Message Preview - Full height with scroll box */}
              <div className="h-full min-h-0">
                <MessagePreview 
                  selectedMessage={selectedMessage}
                  onReply={() => handleReply('reply')}
                  onReplyAll={() => handleReply('replyAll')}
                />
              </div>
            </div>
          )}
        </div>
      </DragDropFrame>

      {/* Success Message Display */}
      {moveSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-2">
          {moveSuccess.message}
        </div>
      )}

      <ReplyPopout
        open={replyModal.isOpen}
        onClose={handleCloseReplyModal}
        onSend={handleSendEmail}
        onGenerateAIReply={handleGenerateAIReply}
        content={replyContent}
        {...transformMessageForReply(selectedMessage, replyModal.type)}
      />
      
      <NewEmailModal
        isOpen={newEmailModalOpen}
        onClose={() => setNewEmailModalOpen(false)}
      />
    </InboxContext.Provider>
  )
}
