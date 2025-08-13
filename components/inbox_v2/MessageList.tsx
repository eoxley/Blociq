"use client"

import { useState, useEffect, useCallback } from 'react'
import { useMessages } from '@/hooks/inbox_v2'
import { useInboxContext } from '@/app/(dashboard)/inbox/InboxV2'
import { Move, Paperclip, Clock, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface MessageListProps {
  selectedFolderId: string | null
  selectedMessageId: string | null
  onMessageSelect: (messageId: string | null) => void
}

export default function MessageList({ selectedFolderId, selectedMessageId, onMessageSelect }: MessageListProps) {
  const { messages, isLoading, refresh } = useMessages(selectedFolderId)
  const { moveMessage } = useInboxContext()
  const [draggedMessage, setDraggedMessage] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [movingMessageId, setMovingMessageId] = useState<string | null>(null)
  const [focusedMessageIndex, setFocusedMessageIndex] = useState<number>(-1)

  // Keyboard navigation and shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!messages.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedMessageIndex(prev => {
          const newIndex = Math.min(prev + 1, messages.length - 1)
          if (newIndex >= 0) {
            onMessageSelect(messages[newIndex].id)
          }
          return newIndex
        })
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setFocusedMessageIndex(prev => {
          const newIndex = Math.max(prev - 1, 0)
          if (newIndex < messages.length) {
            onMessageSelect(messages[newIndex].id)
          }
          return newIndex
        })
        break
      
      case 'Delete':
        e.preventDefault()
        if (focusedMessageIndex >= 0 && focusedMessageIndex < messages.length) {
          const message = messages[focusedMessageIndex]
          handleDelete(message.id)
        }
        break
      
      case 'Enter':
        e.preventDefault()
        if (focusedMessageIndex >= 0 && focusedMessageIndex < messages.length) {
          const message = messages[focusedMessageIndex]
          onMessageSelect(message.id)
        }
        break
    }
  }, [messages, focusedMessageIndex, onMessageSelect])

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Reset focused index when messages change
  useEffect(() => {
    setFocusedMessageIndex(-1)
  }, [messages])

  // Auto-select first message when messages load
  useEffect(() => {
    if (messages.length > 0 && !selectedMessageId) {
      onMessageSelect(messages[0].id)
      setFocusedMessageIndex(0)
    }
  }, [messages, selectedMessageId, onMessageSelect])

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    
    try {
      const response = await fetch(`/api/outlook/v2/messages/${messageId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Clear selection if the deleted message was selected
        if (selectedMessageId === messageId) {
          onMessageSelect(null)
        }
        refresh()
      } else {
        console.error('Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, message: any) => {
    setDraggedMessage(message)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', message.id)
  }

  const handleDragEnd = () => {
    setDraggedMessage(null)
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault()
    
    if (!draggedMessage || targetFolderId === selectedFolderId) {
      console.log('Drop cancelled: same folder or no dragged message')
      return
    }

    console.log(`Dropping message "${draggedMessage.subject}" to folder ${targetFolderId}`)

    try {
      // Set the moving state to show visual feedback
      setMovingMessageId(draggedMessage.id)
      
      // Call the moveMessage function from context
      await moveMessage(draggedMessage.id, targetFolderId)
      
      // Clear selection if the moved message was selected
      if (selectedMessageId === draggedMessage.id) {
        onMessageSelect(null)
      }
      
      // Force refresh to show the updated message list
      console.log('Forcing refresh after message move...')
      await refresh()
      
      // Add a small delay and refresh again to ensure the message is removed
      setTimeout(async () => {
        console.log('Performing delayed refresh to ensure message removal...')
        await refresh()
      }, 500)
      
      console.log(`Message "${draggedMessage.subject}" moved to folder ${targetFolderId}`)
    } catch (error) {
      console.error('Error moving message:', error)
      // You could add a user-facing error message here
    } finally {
      // Clear the moving state
      setMovingMessageId(null)
    }

    setDraggedMessage(null)
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (!selectedFolderId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-4"></div>
        <p className="text-gray-500">Loading folders...</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-4"></div>
        <p className="text-gray-500 mt-2">Loading messages...</p>
        <p className="text-xs text-gray-400 mt-2">Folder: {selectedFolderId}</p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No messages in this folder</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full"></span>
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </h3>
        </div>
        {isDragging && (
          <p className="text-xs text-[#4f46e5] mt-1 font-medium">
            ✨ Drag message to another folder to move it
          </p>
        )}
        {movingMessageId && (
          <p className="text-xs text-green-600 mt-1 font-medium">
            📁 Moving message... Please wait
          </p>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {messages.map((message: any, index: number) => {
            const isSelected = selectedMessageId === message.id
            const isBeingDragged = draggedMessage?.id === message.id
            const isMoving = movingMessageId === message.id
            const isFocused = focusedMessageIndex === index
            const receivedDate = new Date(message.receivedDateTime)
            
            return (
              <div
                key={message.id}
                draggable
                onDragStart={(e) => handleDragStart(e, message)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, selectedFolderId || '')}
                className={`p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-r-2 border-[#4f46e5]'
                    : isFocused
                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-r-2 border-[#a855f7]'
                    : isBeingDragged
                    ? 'opacity-50 scale-95'
                    : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50'
                } ${isDragging && !isBeingDragged ? 'cursor-grab' : ''} ${isMoving ? 'opacity-50 scale-95' : ''}`}
                onClick={() => {
                  onMessageSelect(message.id)
                  setFocusedMessageIndex(index)
                }}
                onFocus={() => setFocusedMessageIndex(index)}
                tabIndex={0}
                role="button"
                aria-label={`Email: ${message.subject || 'No subject'} from ${message.from?.emailAddress?.address || 'Unknown sender'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Move className="h-3 w-3 text-[#4f46e5] flex-shrink-0" />
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                        {message.subject || '(No subject)'}
                      </h4>
                      {message.hasAttachments && (
                        <Paperclip className="h-3 w-3 text-[#a855f7] flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 truncate mb-2 font-medium">
                      {message.from?.emailAddress?.address || 'Unknown sender'}
                    </p>
                    
                    {/* Email preview content */}
                    {message.bodyPreview && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">
                        {truncateText(message.bodyPreview, 120)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3 text-[#4f46e5]" />
                      <span>{formatDistanceToNow(receivedDate, { addSuffix: true })}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(message.id)
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete message"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}