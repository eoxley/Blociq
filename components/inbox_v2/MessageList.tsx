"use client"

import { useState, useEffect, useCallback } from 'react'
import { useMessages } from '@/hooks/inbox_v2'
import { Paperclip, Clock, Trash2, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DraggableEmailRow } from './DraggableEmailRow'
import SearchBar from './SearchBar'

interface MessageListProps {
  selectedFolderId: string | null
  selectedMessageId: string | null
  onMessageSelect: (messageId: string | null) => void
}

export default function MessageList({ selectedFolderId, selectedMessageId, onMessageSelect }: MessageListProps) {
  const { messages, isLoading, error, hasError, refresh } = useMessages(selectedFolderId)
  const [focusedMessageIndex, setFocusedMessageIndex] = useState<number>(-1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredMessages, setFilteredMessages] = useState<any[]>([])

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

  // Filter messages based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = messages.filter((message: any) => {
      const subject = message.subject?.toLowerCase() || ''
      const from = message.from?.emailAddress?.address?.toLowerCase() || ''
      const bodyPreview = message.bodyPreview?.toLowerCase() || ''
      
      return subject.includes(query) || from.includes(query) || bodyPreview.includes(query)
    })
    
    setFilteredMessages(filtered)
  }, [messages, searchQuery])

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

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (!selectedFolderId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-4"></div>
        <p className="text-gray-500">Loading folders...</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-4"></div>
        <p className="text-gray-500 mt-2">Loading messages...</p>
        <p className="text-xs text-gray-400 mt-2">Folder: {selectedFolderId}</p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center h-full flex items-center justify-center">
        <p className="text-gray-500">No messages in this folder</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full shadow-sm">
      {/* Header - Fixed height, no scroll */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full"></span>
            {searchQuery ? `${filteredMessages.length} of ${messages.length}` : messages.length} message{(searchQuery ? filteredMessages.length : messages.length) !== 1 ? 's' : ''}
          </h3>
        </div>
        
        <SearchBar 
          onSearch={handleSearch}
          placeholder="Search emails by subject, sender, or content..."
          className="w-full"
        />
      </div>
      
      {/* Message List - Scrollable with full height */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Loading messages...</p>
            </div>
          </div>
        ) : hasError ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-red-500 text-lg mb-2">⚠️</div>
              <p className="text-red-600 text-sm mb-2">Failed to load messages</p>
              <button
                onClick={() => refresh()}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'No messages match your search' : 'No messages in this folder'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredMessages.map((message: any, index: number) => {
              const isSelected = selectedMessageId === message.id
              const isFocused = focusedMessageIndex === index
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
                      : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50'
                  }`}
                >
                  <div 
                    className="flex items-center justify-between gap-3"
                    onClick={() => {
                      onMessageSelect(message.id)
                      setFocusedMessageIndex(index)
                    }}
                    onFocus={() => setFocusedMessageIndex(index)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Email: ${message.subject || 'No subject'} from ${message.from?.emailAddress?.address || 'Unknown sender'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
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
                </DraggableEmailRow>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}