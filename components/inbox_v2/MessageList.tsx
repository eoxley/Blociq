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
}

export default function MessageList({ 
  selectedFolderId, 
  selectedMessageId, 
  onMessageSelect,
  searchQuery = '',
  showUnreadOnly = false
}: MessageListProps) {
  const { messages, isLoading, refresh } = useMessages(selectedFolderId)
  const [focusedMessageIndex, setFocusedMessageIndex] = useState<number>(-1)
  const [filteredMessages, setFilteredMessages] = useState<any[]>([])

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
        if (focusedMessageIndex >= 0 && focusedMessageIndex < filteredMessages.length) {
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
  }, [filteredMessages, focusedMessageIndex, onMessageSelect])

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
      const response = await fetch(`/api/outlook/v2/messages/${messageId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Clear selected message if it was the deleted one
        if (selectedMessageId === messageId) {
          onMessageSelect(null)
        }
        // Refresh messages
        refresh()
      } else {
        console.error('Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
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
          <span>{filteredMessages.length} of {messages.length} messages</span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        {filteredMessages.map((message, index) => (
          <div
            key={message.id}
            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${
              selectedMessageId === message.id ? 'bg-blue-50 border-l-4 border-l-[#4f46e5]' : ''
            }`}
            onClick={() => onMessageSelect(message.id)}
          >
            <div className="px-4 py-3">
              {/* Message Header */}
              <div className="flex items-start gap-3 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
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
              }`}>
                {message.subject || '(No subject)'}
              </h4>

              {/* Preview */}
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {message.bodyPreview || 'No preview available'}
              </p>

              {/* Message Actions */}
              <div className="flex items-center gap-2 text-gray-400">
                {message.hasAttachments && (
                  <Paperclip className="h-4 w-4" title="Has attachments" />
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
          </div>
        ))}
      </div>
    </div>
  )
}