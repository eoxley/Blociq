"use client"

import { useState } from 'react'
import { useMessages } from '@/hooks/inbox_v2'
import { useInboxContext } from '@/app/(dashboard)/inbox/InboxV2'
import { Trash2, Paperclip, Clock, Move } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface MessageListProps {
  selectedFolderId: string | null
  selectedMessageId: string | null
  onMessageSelect: (messageId: string) => void
}

export default function MessageList({ selectedFolderId, selectedMessageId, onMessageSelect }: MessageListProps) {
  const { messages, isLoading, refresh } = useMessages(selectedFolderId)
  const { moveMessage } = useInboxContext()
  const [draggedMessage, setDraggedMessage] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [movingMessageId, setMovingMessageId] = useState<string | null>(null)

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    
    try {
      const response = await fetch(`/api/outlook/v2/messages/${messageId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
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
      return
    }

    try {
      // Set the moving state to show visual feedback
      setMovingMessageId(draggedMessage.id)
      
      // Call the moveMessage function from context
      await moveMessage(draggedMessage.id, targetFolderId)
      
      // The moveMessage function will handle refreshing, but we also refresh here
      // to ensure immediate UI update
      refresh()
      
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
        <p className="text-gray-500">Select a folder to view messages</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading messages...</p>
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
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </h3>
        {isDragging && (
          <p className="text-xs text-blue-600 mt-1">
            Drag message to another folder to move it
          </p>
        )}
        {movingMessageId && (
          <p className="text-xs text-green-600 mt-1">
            Moving message... Please wait
          </p>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {messages.map((message: any) => {
            const isSelected = selectedMessageId === message.id
            const isBeingDragged = draggedMessage?.id === message.id
            const isMoving = movingMessageId === message.id
            const receivedDate = new Date(message.receivedDateTime)
            
            return (
              <div
                key={message.id}
                draggable
                onDragStart={(e) => handleDragStart(e, message)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, selectedFolderId || '')} // Drop to self for now, will be handled by handleDrop
                className={`p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-50 border-r-2 border-blue-500'
                    : isBeingDragged
                    ? 'opacity-50 scale-95'
                    : 'hover:bg-gray-50'
                } ${isDragging && !isBeingDragged ? 'cursor-grab' : ''} ${isMoving ? 'opacity-50 scale-95' : ''}`}
                onClick={() => onMessageSelect(message.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Move className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                        {message.subject || '(No subject)'}
                      </h4>
                      {message.hasAttachments && (
                        <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate mb-2">
                      {message.from?.emailAddress?.address || 'Unknown sender'}
                    </p>
                    
                    {/* Email preview content */}
                    {message.bodyPreview && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">
                        {truncateText(message.bodyPreview, 120)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
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
