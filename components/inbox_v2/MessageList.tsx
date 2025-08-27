"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useMessages } from '@/hooks/inbox_v2'
import { Paperclip, Clock, Trash2, Mail, Filter, Eye, EyeOff, Star, Flag, Reply, ReplyAll, Forward, Search, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DraggableEmailRow } from './DraggableEmailRow'

interface MessageListProps {
  selectedFolderId: string | null
  selectedMessageId: string | null
  onMessageSelect: (message: any) => void
  searchQuery?: string
  showUnreadOnly?: boolean
  onDragStart?: (e: React.DragEvent, messageId: string, sourceFolderId: string) => void
  selectedMessages?: Set<string>
  setSelectedMessages?: React.Dispatch<React.SetStateAction<Set<string>>>
  onDelete?: (messageIds: string[]) => void
}

export default function MessageList({ 
  selectedFolderId, 
  selectedMessageId, 
  onMessageSelect,
  searchQuery = '',
  showUnreadOnly = false,
  onDragStart,
  selectedMessages: externalSelectedMessages,
  setSelectedMessages: externalSetSelectedMessages,
  onDelete: externalOnDelete
}: MessageListProps) {
  const { messages, isLoading, refresh, lastRefresh } = useMessages(selectedFolderId)
  const [focusedMessageIndex, setFocusedMessageIndex] = useState<number>(-1)
  const [localRefreshTime, setLocalRefreshTime] = useState<Date>(new Date())
  
  // Use external selectedMessages if provided, otherwise use local state
  const [localSelectedMessages, setLocalSelectedMessages] = useState<Set<string>>(new Set())
  const selectedMessages = externalSelectedMessages || localSelectedMessages
  const setSelectedMessages = externalSetSelectedMessages || setLocalSelectedMessages

  // Enhanced filtering with memoization for better performance
  const filteredMessages = useMemo(() => {
    let filtered = messages

    // Apply unread filter
    if (showUnreadOnly) {
      filtered = filtered.filter((message: any) => !message.isRead)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((message: any) => {
        const subject = message.subject?.toLowerCase() || ''
        const sender = message.from?.emailAddress?.address?.toLowerCase() || ''
        const senderName = message.from?.emailAddress?.name?.toLowerCase() || ''
        const body = message.bodyPreview?.toLowerCase() || ''
        
        return subject.includes(query) || 
               sender.includes(query) || 
               senderName.includes(query) || 
               body.includes(query)
      })
    }

    // Sort messages: unread first, then by date (newest first)
    filtered.sort((a: any, b: any) => {
      // Unread messages first
      if (!a.isRead && b.isRead) return -1
      if (a.isRead && !b.isRead) return -1
      
      // Then by date (newest first)
      const dateA = new Date(a.receivedDateTime || a.createdDateTime || 0)
      const dateB = new Date(b.receivedDateTime || b.createdDateTime || 0)
      return dateB.getTime() - dateA.getTime()
    })

    return filtered
  }, [messages, searchQuery, showUnreadOnly])

  // Calculate enhanced statistics
  const unreadCount = messages.filter((message: any) => !message.isRead).length
  const urgentCount = messages.filter((message: any) => 
    message.importance === 'high' || 
    message.subject?.toLowerCase().includes('urgent') ||
    message.subject?.toLowerCase().includes('asap')
  ).length

  // Enhanced refresh function
  const handleRefresh = useCallback(async () => {
    setLocalRefreshTime(new Date())
    await refresh()
  }, [refresh])

  // Auto-refresh when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedFolderId) {
        handleRefresh()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [selectedFolderId, handleRefresh])

  // Keyboard navigation and shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!filteredMessages.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedMessageIndex(prev => {
          const newIndex = Math.min(prev + 1, filteredMessages.length - 1)
          if (newIndex >= 0) {
            onMessageSelect(filteredMessages[newIndex])
          }
          return newIndex
        })
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setFocusedMessageIndex(prev => {
          const newIndex = Math.max(prev - 1, 0)
          if (newIndex < filteredMessages.length) {
            onMessageSelect(filteredMessages[newIndex])
          }
          return newIndex
        })
        break
      
      case 'Delete':
        e.preventDefault()
        if (selectedMessages.size > 0) {
          // Delete all selected messages using the callback
          const messageIds = Array.from(selectedMessages)
          if (externalOnDelete) {
            externalOnDelete(messageIds)
          }
        } else if (focusedMessageIndex >= 0 && focusedMessageIndex < filteredMessages.length) {
          // Delete single focused message
          const message = filteredMessages[focusedMessageIndex]
          if (externalOnDelete) {
            externalOnDelete([message.id])
          }
        }
        break
      
      case 'Enter':
        e.preventDefault()
        if (focusedMessageIndex >= 0 && focusedMessageIndex < filteredMessages.length) {
          const message = filteredMessages[focusedMessageIndex]
          onMessageSelect(message)
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
      setFocusedMessageIndex(-1)
    }
  }, [filteredMessages, selectedMessages, focusedMessageIndex, onMessageSelect, externalOnDelete, setSelectedMessages])

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Handle message selection
  const handleMessageClick = useCallback((message: any, index: number) => {
    onMessageSelect(message)
    setFocusedMessageIndex(index)
  }, [onMessageSelect])

  // Handle message selection with checkbox
  const handleMessageSelect = useCallback((messageId: string, checked: boolean) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(messageId)
      } else {
        newSet.delete(messageId)
      }
      return newSet
    })
  }, [setSelectedMessages])

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedMessages.size === filteredMessages.length) {
      setSelectedMessages(new Set())
    } else {
      const allMessageIds = filteredMessages.map(msg => msg.id)
      setSelectedMessages(new Set(allMessageIds))
    }
  }, [selectedMessages.size, filteredMessages, setSelectedMessages])

  // Handle delete selected
  const handleDeleteSelected = useCallback(() => {
    if (selectedMessages.size > 0 && externalOnDelete) {
      const messageIds = Array.from(selectedMessages)
      externalOnDelete(messageIds)
      setSelectedMessages(new Set())
    }
  }, [selectedMessages, externalOnDelete, setSelectedMessages])

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Search className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">
            {searchQuery || showUnreadOnly 
              ? 'No messages match your filters' 
              : 'No messages in this folder'
            }
          </p>
          {searchQuery && (
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your search terms
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Header with Statistics */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-medium text-gray-700">
              Messages ({filteredMessages.length})
            </h4>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {unreadCount} unread
              </span>
            )}
            {urgentCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {urgentCount} urgent
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh messages"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-xs text-gray-400">
              {localRefreshTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        {/* Bulk Actions */}
        {selectedMessages.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm text-blue-700">
              {selectedMessages.size} message{selectedMessages.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {filteredMessages.map((message: any, index: number) => (
            <DraggableEmailRow
              key={message.id}
              message={message}
              isSelected={selectedMessageId === message.id}
              isFocused={focusedMessageIndex === index}
              isChecked={selectedMessages.has(message.id)}
              onSelect={() => handleMessageClick(message, index)}
              onCheck={(checked) => handleMessageSelect(message.id, checked)}
              onDragStart={onDragStart}
              sourceFolderId={selectedFolderId || ''}
            />
          ))}
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {filteredMessages.length} of {messages.length} messages
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              {selectedMessages.size === filteredMessages.length ? 'Deselect All' : 'Select All'}
            </button>
            <span>•</span>
            <span>Last updated: {lastRefresh?.toLocaleTimeString() || 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}