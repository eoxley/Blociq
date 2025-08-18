"use client"

import { useState, useEffect, useCallback } from 'react'
import { useMessages } from '@/hooks/inbox_v2'
import { Paperclip, Clock, Trash2, Mail, Filter, Eye, EyeOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DraggableEmailRow } from './DraggableEmailRow'
import SearchBar from './SearchBar'

interface MessageListProps {
  selectedFolderId: string | null
  selectedMessageId: string | null
  onMessageSelect: (messageId: string | null) => void
}

export default function MessageList({ selectedFolderId, selectedMessageId, onMessageSelect }: MessageListProps) {
  const { messages, isLoading, refresh } = useMessages(selectedFolderId)
  const [focusedMessageIndex, setFocusedMessageIndex] = useState<number>(-1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredMessages, setFilteredMessages] = useState<any[]>([])
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [sortByUnread, setSortByUnread] = useState(true)

  // Calculate unread count
  const unreadCount = messages.filter((message: any) => !message.isRead).length

  // Keyboard navigation and shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!messages.length) return

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
        
        return subject.includes(query) || from.includes(query) || bodyPreview.includes(query)
      })
    }

    // Apply unread filter
    if (showUnreadOnly) {
      filtered = filtered.filter((message: any) => !message.isRead)
    }

    // Sort messages (unread first, then by date)
    if (sortByUnread) {
      filtered.sort((a: any, b: any) => {
        // First sort by read status (unread first)
        if (!a.isRead && b.isRead) return -1
        if (a.isRead && !b.isRead) return 1
        
        // Then sort by date (newest first)
        const dateA = new Date(a.receivedDateTime)
        const dateB = new Date(b.receivedDateTime)
        return dateB.getTime() - dateA.getTime()
      })
    } else {
      // Sort by date only
      filtered.sort((a: any, b: any) => {
        const dateA = new Date(a.receivedDateTime)
        const dateB = new Date(b.receivedDateTime)
        return dateB.getTime() - dateA.getTime()
      })
    }
    
    setFilteredMessages(filtered)
    
    // Maintain selection if the selected message is still in the filtered list
    if (selectedMessageId && filtered.length > 0) {
      const messageStillExists = filtered.some((msg: any) => msg.id === selectedMessageId)
      if (!messageStillExists && filtered.length > 0) {
        // If selected message is not in filtered list, select the first available
        onMessageSelect(filtered[0].id)
        setFocusedMessageIndex(0)
      }
    }
  }, [messages, searchQuery, showUnreadOnly, sortByUnread, selectedMessageId, onMessageSelect])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

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

  const markMessageAsRead = async (messageId: string) => {
    try {
      const response = await fetch('/api/outlook/v2/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, isRead: true })
      })
      
      if (response.ok) {
        // Refresh messages to update the UI
        refresh()
      } else {
        console.error('Failed to mark message as read')
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const handleMessageSelect = (messageId: string, index: number) => {
    onMessageSelect(messageId)
    setFocusedMessageIndex(index)
    
    // Mark message as read if it's unread
    const message = messages.find((m: any) => m.id === messageId)
    if (message && !message.isRead) {
      markMessageAsRead(messageId)
    }
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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full"></span>
              {searchQuery ? `${filteredMessages.length} of ${messages.length}` : messages.length} message{(searchQuery ? filteredMessages.length : messages.length) !== 1 ? 's' : ''}
            </h3>
            
            {/* Unread count badge */}
            {unreadCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {unreadCount} unread
                </div>
              </div>
            )}
          </div>
          
          {/* Filter controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showUnreadOnly 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={showUnreadOnly ? 'Show all messages' : 'Show unread only'}
            >
              {showUnreadOnly ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showUnreadOnly ? 'All' : 'Unread'}
            </button>
            
            <button
              onClick={() => setSortByUnread(!sortByUnread)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortByUnread 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={sortByUnread ? 'Sort by date only' : 'Sort unread first'}
            >
              <Filter className="h-3 w-3" />
              {sortByUnread ? 'Unread First' : 'Date Only'}
            </button>
          </div>
        </div>
        
        <SearchBar 
          onSearch={handleSearch}
          placeholder="Search emails by subject, sender, or content..."
          className="w-full"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-300px)] scrollbar-thin">
        <div className="divide-y divide-gray-100">
          {filteredMessages.map((message: any, index: number) => {
            const isSelected = selectedMessageId === message.id
            const isFocused = focusedMessageIndex === index
            const isUnread = !message.isRead
            const receivedDate = new Date(message.receivedDateTime)
            
            return (
              <DraggableEmailRow
                key={message.id}
                messageId={message.id}
                sourceFolderId={selectedFolderId || ''}
                className={`p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-r-2 border-[#4f46e5]'
                    : isFocused
                    ? 'bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 border-r-2 border-[#a855f7]'
                    : isUnread
                    ? 'bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100'
                    : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50'
                }`}
              >
                <div 
                  className="flex items-start justify-between gap-3"
                  onClick={(e) => {
                    // Prevent click if we're in a drag operation
                    if (e.currentTarget.closest('[data-draggable]')?.getAttribute('data-dragging') === 'true') {
                      return
                    }
                    handleMessageSelect(message.id, index)
                  }}
                  onFocus={() => setFocusedMessageIndex(index)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Email: ${message.subject || 'No subject'} from ${message.from?.emailAddress?.address || 'Unknown sender'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Unread indicator */}
                      {isUnread && (
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      )}
                      
                      <h4 className={`text-sm font-semibold line-clamp-2 leading-tight ${
                        isUnread ? 'text-gray-900 font-bold' : 'text-gray-900'
                      }`}>
                        {message.subject || '(No subject)'}
                      </h4>
                      
                      {message.hasAttachments && (
                        <Paperclip className="h-3 w-3 text-[#a855f7] flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className={`text-sm truncate mb-2 font-medium ${
                      isUnread ? 'text-gray-900 font-semibold' : 'text-gray-700'
                    }`}>
                      {message.from?.emailAddress?.address || 'Unknown sender'}
                    </p>
                    
                    {/* Email preview content */}
                    {message.bodyPreview && (
                      <p className={`text-xs line-clamp-2 mb-2 leading-relaxed ${
                        isUnread ? 'text-gray-800 font-medium' : 'text-gray-600'
                      }`}>
                        {truncateText(message.bodyPreview, 120)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3 text-[#4f46e5]" />
                      <span>{formatDistanceToNow(receivedDate, { addSuffix: true })}</span>
                      {isUnread && (
                        <span className="text-red-600 font-medium">• Unread</span>
                      )}
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
              </DraggableEmailRow>
            )
          })}
        </div>
      </div>
    </div>
  )
}