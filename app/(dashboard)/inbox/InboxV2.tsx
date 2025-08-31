"use client"

import React, { useState, createContext, useContext, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, Search, Filter, RefreshCw, Settings, MoreVertical, FileText, Sparkles, Zap, TrendingUp, Users, Clock, Brain, BarChart3, Mail, CheckCircle } from 'lucide-react'
import FolderSidebar from '@/components/inbox_v2/FolderSidebar'
import MessageList from '@/components/inbox_v2/MessageList'
import MessagePreview from '@/components/inbox_v2/MessagePreview'
import ReplyModal from '@/components/inbox_v2/ReplyModal'
import NewEmailModal from '@/components/inbox_v2/NewEmailModal'
import TriageButton from '@/components/inbox_v2/TriageButton'
import DraftsPanel from '@/components/inbox_v2/DraftsPanel'
import InboxDashboard from '@/components/inbox_v2/InboxDashboard'
import { useMessages, useFolders } from '@/hooks/inbox_v2'
import { mutate } from 'swr'
import { cn } from '@/lib/utils'

// Context for inbox state
interface InboxContextType {
  selectedFolderId: string | null
  selectedMessage: any | null
  setSelectedFolderId: (folderId: string) => void
  setSelectedMessage: (message: any) => void
  moveMessage: (messageId: string, destinationFolderId: string) => Promise<boolean>
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
  const [newEmailModalOpen, setNewEmailModalOpen] = useState(false)
  const [moveSuccess, setMoveSuccess] = useState<{ message: string; timestamp: number } | null>(null)
  const [triageSuccess, setTriageSuccess] = useState<{ message: string; timestamp: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [draggedMessage, setDraggedMessage] = useState<{ messageId: string; sourceFolderId: string } | null>(null)
  const [isMovingMessage, setIsMovingMessage] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [draftsPanelOpen, setDraftsPanelOpen] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())
  const [currentView, setCurrentView] = useState<'inbox' | 'dashboard'>('inbox')

  // Get folders and messages with enhanced data fetching
  const { folders, isLoading: foldersLoading, isFallback } = useFolders()
  const { 
    messages, 
    selectedId, 
    setSelectedId, 
    triage, 
    isTriaging, 
    error: triageError,
    triageMessage,
    refresh: refreshMessages 
  } = useMessages(selectedFolderId)

  // Enhanced refresh function with timestamp update
  const handleRefresh = useCallback(async () => {
    setLastRefreshTime(new Date())
    await refreshMessages()
  }, [refreshMessages])

  // Enhanced navigation functions for message handling
  const navigateToMessage = useCallback((messageId: string) => {
    const message = messages.find((msg: any) => msg.id === messageId)
    if (message) {
      setSelectedMessage(message)
      setSelectedId(messageId)
      setCurrentView('inbox') // Switch to inbox view when navigating to specific message
    }
  }, [messages, setSelectedId])

  // Enhanced filtering integration with MessageList
  const handleFilteredNavigation = useCallback((filter: any) => {
    // Apply the filter to message list and select first result
    if (filter && Object.keys(filter).length > 0) {
      setCurrentView('inbox') // Switch to inbox view when applying filters
      // TODO: Implement actual filtering logic here
      console.log('Applied filter:', filter)
    }
  }, [])

  // Dashboard integration callbacks
  const handleDashboardRefresh = useCallback(() => {
    handleRefresh()
  }, [handleRefresh])

  // Set the inbox folder as default when folders are loaded
  useEffect(() => {
    if (folders.length > 0 && !selectedFolderId) {
      // Find the inbox folder (either from Graph API or default folders)
      const inboxFolder = folders.find(folder => 
        folder.wellKnownName === 'inbox' || 
        folder.displayName.toLowerCase() === 'inbox'
      )
      if (inboxFolder) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Inbox] Setting inbox folder ID:', inboxFolder.id, 'for folder:', inboxFolder.displayName)
        }
        setSelectedFolderId(inboxFolder.id)
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Inbox] No inbox folder found in:', folders)
        }
      }
    }
  }, [folders, selectedFolderId])

  // Debug logging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Inbox] Folders loaded:', folders.length, 'Selected folder ID:', selectedFolderId)
    }
  }, [folders, selectedFolderId])

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Inbox] Messages loaded:', messages.length, 'for folder:', selectedFolderId)
    }
    
    // Clear selected message if it's no longer in the current message list
    if (selectedMessage && messages.length > 0) {
      const messageStillExists = messages.some((msg: any) => msg.id === selectedMessage.id)
      if (!messageStillExists) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Inbox] Selected message no longer exists in current list, clearing selection')
        }
        setSelectedMessage(null)
      }
    }
  }, [messages, selectedFolderId, selectedMessage])

  // Sync selectedId with selectedMessage
  useEffect(() => {
    if (selectedId && selectedId !== selectedMessage?.id) {
      const message = messages.find((msg: any) => msg.id === selectedId)
      if (message) {
        setSelectedMessage(message)
      }
    }
  }, [selectedId, selectedMessage, messages])

  // Clear success message after appropriate time
  useEffect(() => {
    if (moveSuccess) {
      const isError = moveSuccess.message.includes('❌')
      const isLoading = moveSuccess.message.includes('⏳')
      
      // Don't auto-clear loading messages
      if (!isLoading) {
        const timer = setTimeout(() => {
          setMoveSuccess(null)
        }, isError ? 5000 : 3000) // Error messages stay longer
        
        return () => clearTimeout(timer)
      }
    }
  }, [moveSuccess])

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    
    try {
      const response = await fetch(`/api/outlook/v2/messages/${messageId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Clear selected message
        setSelectedMessage(null)
        setSelectedId(null)
        // Refresh messages
        handleRefresh()
      } else {
        console.error('Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const handleDeleteMultiple = async (messageIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${messageIds.length} message${messageIds.length !== 1 ? 's' : ''}?`)) return
    
    try {
      // Delete messages in parallel
      const deletePromises = messageIds.map(messageId => 
        fetch(`/api/outlook/v2/messages/${messageId}`, { method: 'DELETE' })
      )
      
      const responses = await Promise.all(deletePromises)
      const allSuccessful = responses.every(response => response.ok)
      
      if (allSuccessful) {
        // Clear selected messages and refresh
        setSelectedMessages(new Set())
        if (selectedMessage && messageIds.includes(selectedMessage.id)) {
          setSelectedMessage(null)
          setSelectedId(null)
        }
        handleRefresh()
      } else {
        console.error('Some messages failed to delete')
      }
    } catch (error) {
      console.error('Error deleting messages:', error)
    }
  }

  const handleReply = (type: 'reply' | 'replyAll') => {
    setReplyModal({ isOpen: true, type })
  }

  const handleCloseReplyModal = () => {
    setReplyModal({ isOpen: false, type: 'reply' })
  }

  // Global keyboard shortcuts for inbox
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLDivElement && e.target.contentEditable === 'true') {
        return
      }

      // Refresh with F5 or Ctrl+R
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault()
        handleRefresh()
      }

      // New email with Ctrl+N
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        setNewEmailModalOpen(true)
      }

      // Triage with Ctrl+T
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault()
        if (selectedId) {
          triageMessage(selectedId)
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleRefresh, selectedId, triageMessage])

  const handleMessageSelect = useCallback((message: any) => {
    setSelectedMessage(message)
    setSelectedId(message.id)
  }, [])

  const moveMessage = useCallback(async (messageId: string, destinationFolderId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/outlook/v2/messages/${messageId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinationFolderId
        })
      })

      if (response.ok) {
        // Refresh messages to get updated state
        handleRefresh()
        return true
      } else {
        console.error('Failed to move message')
        return false
      }
    } catch (error) {
      console.error('Error moving message:', error)
      return false
    }
  }, [handleRefresh])

  const contextValue: InboxContextType = {
    selectedFolderId,
    selectedMessage,
    setSelectedFolderId,
    setSelectedMessage,
    moveMessage
  }

  const handleDragStart = useCallback((e: React.DragEvent, messageId: string, sourceFolderId: string) => {
    setDraggedMessage({ messageId, sourceFolderId })
    e.dataTransfer.effectAllowed = 'move'
    
    // Create a custom drag image
    const dragImage = document.createElement('div')
    dragImage.innerHTML = '📧 Moving email...'
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.left = '-1000px'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    
    // Clean up after drag starts
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, destinationFolderId: string) => {
    e.preventDefault()
    
    if (!draggedMessage) return
    
    const { messageId, sourceFolderId } = draggedMessage
    
    // Don't move to the same folder
    if (destinationFolderId === sourceFolderId) {
      setDraggedMessage(null)
      return
    }

    try {
      // Show loading state
      setMoveSuccess({ message: '⏳ Moving email...', timestamp: Date.now() })
      
      // Move the message
      const success = await moveMessage(messageId, destinationFolderId)
      
      if (success) {
        // Show success message
        setMoveSuccess({ message: '✅ Email moved successfully!', timestamp: Date.now() })
      } else {
        // Show error message
        setMoveSuccess({ message: '❌ Failed to move email', timestamp: Date.now() })
      }
    } catch (error) {
      // Show error message
      setMoveSuccess({ message: '❌ Failed to move email', timestamp: Date.now() })
      console.error('Error moving message:', error)
    } finally {
      setDraggedMessage(null)
    }
  }, [draggedMessage, moveMessage])

  // Calculate enhanced statistics
  const unreadCount = messages.filter((message: any) => !message.isRead).length
  const selectedFolder = folders.find(f => f.id === selectedFolderId)
  const totalMessages = messages.length
  const urgentMessages = messages.filter((message: any) => 
    message.importance === 'high' || 
    message.subject?.toLowerCase().includes('urgent') ||
    message.subject?.toLowerCase().includes('asap')
  ).length

  const Provider = InboxContext.Provider

  return (
    <Provider value={contextValue}>
      {/* Enhanced Modern Email Client Header with Full BlocIQ Design Magic */}
      <div className="bg-gradient-to-r from-white via-blue-50/30 to-purple-50/30 border-b border-gray-200 px-8 py-8 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="relative group">
              <div className="w-16 h-16 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] rounded-3xl flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:scale-110">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              {/* Enhanced floating sparkles with more animation */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse group-hover:animate-bounce"></div>
              <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse group-hover:animate-bounce" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute top-1/2 -right-3 w-2 h-2 bg-pink-400 rounded-full animate-ping"></div>
              <div className="absolute top-1/2 -left-3 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] bg-clip-text text-transparent drop-shadow-sm">
                Inbox
              </h1>
              <div className="flex items-center gap-4 mt-3">
                <p className="text-sm text-gray-600 flex items-center gap-2 bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full border border-gray-200/50">
                  <Users className="h-4 w-4 text-blue-500" />
                  {selectedFolder ? selectedFolder.displayName : 'Loading...'} • {totalMessages} messages
                </p>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 shadow-sm">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {unreadCount} unread
                  </span>
                )}
                {urgentMessages > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300 shadow-sm">
                    <Zap className="h-3 w-3 mr-1" />
                    {urgentMessages} urgent
                  </span>
                )}
                {isMovingMessage && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300 shadow-sm">
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    Moving...
                  </span>
                )}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 shadow-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  Last updated: {lastRefreshTime.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setNewEmailModalOpen(true)}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] text-white rounded-2xl hover:from-[#4338ca] hover:via-[#6d28d9] hover:to-[#9333ea] transition-all duration-300 shadow-2xl hover:shadow-3xl font-semibold transform hover:scale-105 hover:-translate-y-1"
            >
              <div className="relative">
                <Plus className="h-6 w-6" />
                <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
              </div>
              <span className="text-lg">New Email</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            <button
              onClick={() => setDraftsPanelOpen(true)}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white rounded-2xl hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 transition-all duration-300 shadow-2xl hover:shadow-3xl font-semibold transform hover:scale-105 hover:-translate-y-1"
            >
              <div className="relative">
                <FileText className="h-6 w-6" />
                <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
              </div>
              <span className="text-lg">AI Drafts</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            <TriageButton 
              selectedMessageId={selectedId}
              onTriage={triageMessage}
              onBulkTriage={async () => {}}
              isTriaging={isTriaging}
              triageResult={triage}
              triageError={triageError}
              onTriageSuccess={(result) => {
                let message = ''
                if (result.summary && result.summary.includes('Processed')) {
                  // Bulk triage result
                  message = `✅ ${result.summary} Please review your draft replies in Outlook.`
                } else {
                  // Single triage result
                  message = `✅ AI Triage completed! Email categorized as "${result.category}". Check your Outlook for draft replies and categories.`
                }
                
                setTriageSuccess({ 
                  message,
                  timestamp: Date.now() 
                })
                // Clear success message after 5 seconds
                setTimeout(() => setTriageSuccess(null), 5000)
              }}
            />
            
            <button
              onClick={handleRefresh}
              disabled={foldersLoading}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              title="Refresh (F5)"
            >
              <RefreshCw className={`h-5 w-5 ${foldersLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110" title="Settings">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 🎯 HERO BANNER SECTION - Making the page engaging and informative */}
      <div className="bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] px-8 py-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Email Management Dashboard</h2>
              <p className="text-white/90 text-sm">
                {totalMessages} total messages • {unreadCount} unread • {urgentMessages} urgent • Last updated {lastRefreshTime.toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          {/* 🧠 MINI ASKBLOQIQ WIDGET - Compact AI assistant */}
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-white">
                  <p className="text-sm font-medium">Ask BlocIQ AI</p>
                  <p className="text-xs text-white/70">Smart email assistance</p>
                </div>
                <button
                  onClick={() => {
                    const button = document.querySelector('[data-askblociq-button]') as HTMLElement;
                    if (button) button.click();
                  }}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105 border border-white/30"
                >
                  Ask Now
                </button>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div className="text-white">
                  <p className="text-sm font-medium">AI Triage</p>
                  <p className="text-xs text-white/70">Auto-categorize emails</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 QUICK STATS SECTION with Dashboard Toggle */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalMessages}</div>
              <div className="text-sm text-gray-600">Total Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
              <div className="text-sm text-gray-600">Unread</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{urgentMessages}</div>
              <div className="text-sm text-gray-600">Urgent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{selectedFolder ? selectedFolder.displayName : 'Inbox'}</div>
              <div className="text-sm text-gray-600">Current Folder</div>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-lg border border-gray-200">
            <button
              onClick={() => setCurrentView('inbox')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentView === 'inbox' 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Mail className="h-4 w-4" />
              Inbox
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentView === 'dashboard' 
                  ? 'bg-purple-500 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Conditional View Rendering */}
      {currentView === 'dashboard' ? (
        <div className="flex-1 p-8 bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 overflow-auto">
          <InboxDashboard 
            onRefresh={handleDashboardRefresh}
            onNavigateToInbox={handleFilteredNavigation}
            onNavigateToEmail={navigateToMessage}
          />
        </div>
      ) : (
          <div className="flex h-[calc(100vh-400px)] bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20">
        {/* Left Column: Enhanced Folder Sidebar */}
        <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex flex-col shadow-xl">
          <div className="p-6 border-b border-gray-200/50 bg-gradient-to-b from-white/90 via-blue-50/30 to-purple-50/30">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="relative">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <div className="absolute inset-0 bg-purple-400/30 rounded-full animate-ping"></div>
              </div>
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Folders</span>
            </h3>
            <FolderSidebar 
              selectedFolderId={selectedFolderId}
              onFolderSelect={(folderId) => {
                setSelectedFolderId(folderId)
                setSelectedMessage(null) // Clear selected message when changing folders
                setSelectedId(null)
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
          </div>
        </div>

        {/* Middle Column: Enhanced Message List */}
        <div className="w-96 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex flex-col shadow-xl">
          <div className="p-6 border-b border-gray-200/50 bg-gradient-to-b from-white/90 via-blue-50/30 to-purple-50/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <div className="relative">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-pulse"></div>
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Messages</span>
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 group w-80">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm focus:bg-white focus:shadow-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                </div>
                <button
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className={`group relative p-3 rounded-2xl transition-all duration-300 ${
                    showUnreadOnly 
                      ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-300 shadow-lg' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 border border-transparent hover:border-gray-300 hover:shadow-lg'
                  }`}
                  title="Show unread only"
                >
                  <Filter className={`h-4 w-4 transition-transform duration-200 ${showUnreadOnly ? 'scale-110' : 'group-hover:scale-110'}`} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <MessageList 
              selectedFolderId={selectedFolderId}
              selectedMessageId={selectedId}
              onMessageSelect={handleMessageSelect}
              searchQuery={searchQuery}
              showUnreadOnly={showUnreadOnly}
              onDragStart={handleDragStart}
              selectedMessages={selectedMessages}
              setSelectedMessages={setSelectedMessages}
              onDelete={handleDeleteMultiple}
            />
          </div>
        </div>

        {/* Right Column: Enhanced Message Preview */}
        <div className="flex-1 bg-white/80 backdrop-blur-sm flex flex-col shadow-xl">
          {selectedMessage ? (
            <MessagePreview 
              selectedMessage={selectedMessage}
              onReply={() => handleReply('reply')}
              onReplyAll={() => handleReply('replyAll')}
              onMessageUpdate={handleRefresh}
              triageResult={triage}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50/50 via-blue-50/20 to-purple-50/20">
              <div className="text-center group">
                <div className="relative mb-6">
                  <MessageSquare className="h-20 w-20 text-gray-300 mx-auto group-hover:text-gray-400 transition-colors duration-300" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center shadow-lg">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  {/* Enhanced floating elements */}
                  <div className="absolute -top-4 -left-4 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-4 -right-4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">No message selected</h3>
                <p className="text-gray-500 mb-4">Select a message from the list to preview it here</p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200/50">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>Use the AskBlocIQ AI button for assistance</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Success/Error Message Display with Full BlocIQ Design Magic */}
      {moveSuccess && (
        <div className={cn(
          "fixed bottom-6 right-6 px-8 py-5 rounded-3xl shadow-2xl z-50 animate-in slide-in-from-bottom-2 transition-all duration-500 border backdrop-blur-sm",
          moveSuccess.message.includes('✅') ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-400 shadow-green-500/25' : 
          moveSuccess.message.includes('❌') ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-400 shadow-red-500/25' : 
          'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400 shadow-blue-500/25'
        )}>
          <div className="flex items-center gap-4">
            {moveSuccess.message.includes('✅') && (
              <div className="relative">
                <span className="text-2xl">✅</span>
                <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
              </div>
            )}
            {moveSuccess.message.includes('❌') && (
              <div className="relative">
                <span className="text-2xl">❌</span>
                <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
              </div>
            )}
            {!moveSuccess.message.includes('✅') && !moveSuccess.message.includes('❌') && (
              <div className="relative">
                <span className="text-2xl">⏳</span>
                <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
              </div>
            )}
            <span className="font-semibold text-lg">{moveSuccess.message}</span>
          </div>
        </div>
      )}

      {triageSuccess && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 text-white px-8 py-5 rounded-3xl shadow-2xl z-50 animate-in slide-in-from-bottom-2 border border-emerald-400 backdrop-blur-sm shadow-emerald-500/25">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Sparkles className="h-6 w-6" />
              <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
            </div>
            <span className="font-semibold text-lg">{triageSuccess.message}</span>
          </div>
        </div>
      )}

      <ReplyModal
        isOpen={replyModal.isOpen}
        onClose={handleCloseReplyModal}
        message={selectedMessage}
        replyType={replyModal.type}
      />
      
      <NewEmailModal
        isOpen={newEmailModalOpen}
        onClose={() => setNewEmailModalOpen(false)}
      />

      {/* Enhanced Ask BlocIQ AI Assistant with Pulsating Brain Design */}
      {/* <AskBlocIQButton selectedMessage={selectedMessage} data-askblociq-button /> */}

      {/* AI Drafts Panel */}
      <DraftsPanel
        isOpen={draftsPanelOpen}
        onClose={() => setDraftsPanelOpen(false)}
        onEditDraft={(draft) => {
          // TODO: Implement draft editing functionality
          console.log('Edit draft:', draft)
          setDraftsPanelOpen(false)
        }}
        onSendDraft={(draft) => {
          // TODO: Implement draft sending functionality
          console.log('Send draft:', draft)
          setDraftsPanelOpen(false)
        }}
      />
    </Provider>
  )
}
