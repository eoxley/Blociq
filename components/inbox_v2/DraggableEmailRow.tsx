'use client'
import { memo } from 'react'
import { Paperclip, Clock, Eye, EyeOff, Star, Flag, AlertCircle, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface DraggableEmailRowProps {
  message: any
  isSelected: boolean
  isFocused: boolean
  isChecked: boolean
  onSelect: () => void
  onCheck: (checked: boolean) => void
  onDragStart: (e: React.DragEvent, messageId: string, sourceFolderId: string) => void
  sourceFolderId: string
}

export const DraggableEmailRow = memo(function DraggableEmailRow({ 
  message, 
  isSelected, 
  isFocused,
  isChecked,
  onSelect, 
  onCheck,
  onDragStart,
  sourceFolderId 
}: DraggableEmailRowProps) {
  
  const handleDragStart = (e: React.DragEvent) => {
    // Set proper data transfer for drag-and-drop to work
    e.dataTransfer.setData('text/plain', message.id)
    e.dataTransfer.setData('application/json', JSON.stringify({
      messageId: message.id,
      sourceFolderId
    }))
    
    // Set drag image and effect
    e.dataTransfer.effectAllowed = 'move'
    
    // Call the parent handler
    onDragStart(e, message.id, sourceFolderId)
  }

  const handleMarkAsRead = async (e: React.MouseEvent, isRead: boolean) => {
    e.stopPropagation()
    try {
      const response = await fetch('/api/outlook/v2/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId: message.id, isRead })
      })
      
      if (response.ok) {
        // The parent component will handle refreshing
        console.log('Message marked as read:', isRead)
      } else {
        console.error('Failed to mark message as read')
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const isUrgent = message.importance === 'high' || 
                   message.subject?.toLowerCase().includes('urgent') ||
                   message.subject?.toLowerCase().includes('asap')

  const receivedDate = new Date(message.receivedDateTime || message.createdDateTime || Date.now())

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all duration-200',
        'hover:bg-gray-50 border-l-4 border-l-transparent',
        isSelected && 'bg-blue-50 border-l-blue-500',
        isFocused && 'ring-2 ring-blue-200 ring-inset',
        isUrgent && 'border-l-red-500'
      )}
    >
      <div className="px-4 py-3">
        {/* Message Header with Selection Checkbox */}
        <div className="flex items-start gap-3 mb-2">
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onCheck(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 h-4 w-4 text-[#4f46e5] border-gray-300 rounded focus:ring-[#4f46e5] focus:ring-2"
          />
          
          <div className="flex items-center gap-2 flex-1 min-w-0" onClick={onSelect}>
            {/* Unread indicator */}
            {!message.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
            )}
            
            {/* Urgent indicator */}
            {isUrgent && (
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            )}
            
            {/* Sender */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                !message.isRead ? 'text-gray-900' : 'text-gray-700'
              )}>
                {message.from?.emailAddress?.name || message.from?.emailAddress?.address || 'Unknown'}
              </p>
            </div>
          </div>
          
          {/* Time */}
          <span className="text-xs text-gray-500 flex-shrink-0 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(receivedDate, { addSuffix: true })}
          </span>
        </div>

        {/* Subject */}
        <h4 className={cn(
          "text-sm font-medium mb-1 truncate cursor-pointer",
          !message.isRead ? 'text-gray-900' : 'text-gray-700'
        )} onClick={onSelect}>
          {message.subject || '(No subject)'}
        </h4>

        {/* Preview */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-2 cursor-pointer" onClick={onSelect}>
          {message.bodyPreview || 'No preview available'}
        </p>

        {/* Message Actions */}
        <div className="flex items-center gap-2 text-gray-400">
          {message.hasAttachments && (
            <Paperclip className="h-4 w-4" title="Has attachments" />
          )}
          
          <button
            onClick={(e) => handleMarkAsRead(e, !message.isRead)}
            className="p-1 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title={message.isRead ? 'Mark as unread' : 'Mark as read'}
          >
            {message.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Implement flag functionality
            }}
            className="p-1 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Flag message"
          >
            <Flag className="h-4 w-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Implement star functionality
            }}
            className="p-1 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Star message"
          >
            <Star className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
})
