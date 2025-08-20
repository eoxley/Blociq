"use client"

import { useState, useEffect, useCallback } from 'react'
import { useMessages } from '@/hooks/inbox_v2'
import { Paperclip, Clock, Trash2, Mail, Filter, Eye, EyeOff, Star, Flag, Reply, ReplyAll, Forward } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DraggableEmailRow } from './DraggableEmailRow'

interface MessageListProps {
  selectedFolderId: string | null
  selectedMessageId: string | null
  onMessageSelect: (messageId: string | null) => void
  searchQuery?: string
  showUnreadOnly?: boolean
  onDragStart?: (e: React.DragEvent, messageId: string, sourceFolderId: string) => void
}

export default function MessageList({ 
  selectedFolderId, 
  selectedMessageId, 
  onMessageSelect,
  searchQuery = '',
  showUnreadOnly = false,
  onDragStart
}: MessageListProps) {
  const { messages, isLoading, refresh } = useMessages(selectedFolderId)
  const [focusedMessageIndex, setFocusedMessageIndex] = useState<number>(-1)
  const [filteredMessages, setFilteredMessages] = useState<any[]>([])
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())

  // Calculate unread count
  const unreadCount = messages.filter((message: any) => !message.isRead).length

  // Keyboard navigation and shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!filteredMessages.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedMessageIndex(prev => {
          const newIndex = Math.min(prev + 1, filteredMessages.length - 1)
          if (newIndex >= 0) {
            onMessageSelect(filteredMessages[newIndex].id)
          }
          return newIndex
        })
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setFocusedMessageIndex(prev => {
          const newIndex = Math.max(prev - 1, 0)
          if (newIndex < filteredMessages.length) {
            onMessageSelect(filteredMessages[newIndex].id)
          }
          return newIndex
        })
        break
      
      case 'Delete':
        e.preventDefault()
        if (selectedMessages.size > 0) {
          // Delete all selected messages
          handleDeleteMultiple(Array.from(selectedMessages))
        } else if (focusedMessageIndex >= 0 && focusedMessageIndex < filteredMessages.length) {
          // Delete single focused message
          const message = filteredMessages[focusedMessageIndex]
          handleDelete(message.id)
        }
        break
      
      case 'Enter':
        e.preventDefault()
        if (focusedMessageIndex >= 0 && focusedMessageIndex < filteredMessages.length) {
          const message = filteredMessages[focusedMessageIndex]
          onMessageSelect(message.id)
        }
        break
    }

    // Handle Ctrl+A for select all
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault()
      const allMessageIds = filteredMessages.map(msg => msg.id)
      setSelectedMessages(new Set(allMessageIds))
    }

    // Handle Escape to clear selection
    if (e.key === 'Escape') {
      setSelectedMessages(new Set())
    }
  }, [filteredMessages, focusedMessageIndex, onMessageSelect, selectedMessages])

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
    if (filteredMessages.length > 0 && !selectedMessageId) {
      onMessageSelect(filteredMessages[0].id)
      setFocusedMessageIndex(0)
    }
  }, [filteredMessages, selectedMessageId, onMessageSelect])

  // Auto-mark message as read when selected (removes blue dot)
  useEffect(() => {
    if (selectedMessageId) {
      const selectedMessage = messages.find((msg: any) => msg.id === selectedMessageId)
      
      // If the selected message is unread, mark it as read
      if (selectedMessage && !selectedMessage.isRead) {
        // Mark as read directly here to avoid dependency issues
        const markAsRead = async () => {
          try {
            const response = await fetch('/api/outlook/v2/messages/mark-read', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ messageId: selectedMessageId, isRead: true })
            })
            
            if (response.ok) {
              // Refresh messages to show updated state
              refresh()
            } else {
              console.error('Failed to mark message as read')
            }
          } catch (error) {
            console.error('Error marking message as read:', error)
          }
        }
        markAsRead()
      }
    }
  }, [selectedMessageId, messages, refresh])

  // Filter and sort messages
  useEffect(() => {
    let filtered = messages

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((message: any) => {
        const subject = message.subject?.toLowerCase() || ''
        const from = message.from?.emailAddress?.address?.toLowerCase() || ''
        const bodyPreview = message.bodyPreview?.toLowerCase() || ''
        
        return subject.includes(query) || 
               from.includes(query) || 
               bodyPreview.includes(query)
      })
    }

    // Apply unread filter
    if (showUnreadOnly) {
      filtered = filtered.filter((message: any) => !message.isRead)
    }

    // Sort messages: unread first, then by date (newest first)
    filtered.sort((a: any, b: any) => {
      // Unread messages first
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1
      }
      
      // Then by date (newest first)
      const dateA = new Date(a.receivedDateTime || a.createdDateTime || 0)
      const dateB = new Date(b.receivedDateTime || b.createdDateTime || 0)
      return dateB.getTime() - dateA.getTime()
    })

    setFilteredMessages(filtered)
  }, [messages, searchQuery, showUnreadOnly])

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    
    try {
      // Move to deleted folder instead of permanent deletion
      const response = await fetch('/api/outlook/v2/messages/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messageId, 
          destinationFolderId: 'deleteditems' // Move to deleted items folder
        })
      })
      
      if (response.ok) {
        // Clear selected message if it was the deleted one
        if (selectedMessageId === messageId) {
          onMessageSelect(null)
        }
        // Refresh messages
        refresh()
      } else {
        console.error('Failed to move message to deleted folder')
      }
    } catch (error) {
      console.error('Error moving message to deleted folder:', error)
    }
  }

  const handleDeleteMultiple = async (messageIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${messageIds.length} messages?`)) return

    try {
      // Move all selected messages to deleted folder
      const promises = messageIds.map(messageId => 
        fetch('/api/outlook/v2/messages/move', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            messageId, 
            destinationFolderId: 'deleteditems' // Move to deleted items folder
          })
        })
      )

      const responses = await Promise.all(promises)
      const allSuccessful = responses.every(response => response.ok)

      if (allSuccessful) {
        // Clear selected messages
        setSelectedMessages(new Set())
        // Clear selected message if it was among the deleted ones
        if (selectedMessageId && messageIds.includes(selectedMessageId)) {
          onMessageSelect(null)
        }
        // Refresh messages
        refresh()
      } else {
        console.error('Failed to move some messages to deleted folder')
      }
    } catch (error) {
      console.error('Error moving messages to deleted folder:', error)
    }
  }

  const handleMarkAsRead = async (messageId: string, isRead: boolean) => {
    try {
      const response = await fetch('/api/outlook/v2/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, isRead })
      })
      
      if (response.ok) {
        // Refresh messages to show updated state
        refresh()
      } else {
        console.error('Failed to mark message as read')
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No messages found</h3>
          <p className="text-gray-500">
            {searchQuery ? 'Try adjusting your search terms' : 
             showUnreadOnly ? 'No unread messages' : 'No messages in this folder'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message List Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <span>{filteredMessages.length} of {messages.length} messages</span>
            {selectedMessages.size > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {selectedMessages.size} selected
              </span>
            )}
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {unreadCount} unread
              </span>
            )}
          </div>
          
          {/* Selection Controls */}
          {selectedMessages.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMessages(new Set())}
                className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-200"
              >
                Clear
              </button>
              <button
                onClick={() => handleDeleteMultiple(Array.from(selectedMessages))}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-100"
              >
                Delete ({selectedMessages.size})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        {filteredMessages.map((message, index) => (
          <DraggableEmailRow
            key={message.id}
            messageId={message.id}
            sourceFolderId={selectedFolderId || ''}
            onDragStart={onDragStart || (() => {})}
            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${
              selectedMessageId === message.id ? 'bg-blue-50 border-l-4 border-l-[#4f46e5]' : ''
            }`}
          >
            <div className="px-4 py-3">
              {/* Message Header with Selection Checkbox */}
              <div className="flex items-start gap-3 mb-2">
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedMessages.has(message.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    const newSelected = new Set(selectedMessages)
                    if (e.target.checked) {
                      newSelected.add(message.id)
                    } else {
                      newSelected.delete(message.id)
                    }
                    setSelectedMessages(newSelected)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 h-4 w-4 text-[#4f46e5] border-gray-300 rounded focus:ring-[#4f46e5] focus:ring-2"
                />
                
                <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => onMessageSelect(message.id)}>
                  {/* Unread indicator */}
                  {!message.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  )}
                  
                  {/* Sender */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      !message.isRead ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {message.from?.emailAddress?.name || message.from?.emailAddress?.address || 'Unknown'}
                    </p>
                  </div>
                </div>
                
                {/* Time */}
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatDistanceToNow(new Date(message.receivedDateTime || message.createdDateTime || Date.now()), { addSuffix: true })}
                </span>
              </div>

              {/* Subject */}
              <h4 className={`text-sm font-medium mb-1 truncate ${
                !message.isRead ? 'text-gray-900' : 'text-gray-700'
              }`} onClick={() => onMessageSelect(message.id)}>
                {message.subject || '(No subject)'}
              </h4>

              {/* Preview */}
              <p className="text-sm text-gray-600 line-clamp-2 mb-2" onClick={() => onMessageSelect(message.id)}>
                {message.bodyPreview || 'No preview available'}
              </p>

              {/* Message Actions */}
              <div className="flex items-center gap-2 text-gray-400">
                {message.hasAttachments && (
                  <Paperclip className="h-4 w-4" />
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleMarkAsRead(message.id, !message.isRead)
                  }}
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
          </DraggableEmailRow>
        ))}
      </div>
    </div>
  )
}