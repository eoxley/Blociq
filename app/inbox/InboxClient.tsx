'use client'

import { useState } from 'react'
import { 
  Mail, Clock, User, RefreshCw, ExternalLink, ChevronDown, ChevronUp, History, 
  MessageSquare, Loader2, Send, Edit3, Check, Tag, Flag, Search, Filter, 
  Archive, Trash2, Star, MoreHorizontal, Reply, Forward, Delete, Pin, 
  Eye, EyeOff, Calendar, Building, AlertCircle, CheckCircle, Clock as ClockIcon,
  Wrench, Construction
} from 'lucide-react'
import { supabase } from '@/utils/supabase/client'

// Define the Email type based on the database schema
type Email = {
  id: string
  from_email: string | null
  subject: string | null
  body_preview: string | null
  received_at: string | null
  unread: boolean | null
  handled: boolean | null
  pinned: boolean | null
  flag_status: string | null
  categories: string[] | null
}

interface InboxClientProps {
  emails: Email[]
}

export default function InboxClient({ emails }: InboxClientProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [emailHistory, setEmailHistory] = useState<Record<string, Email[]>>({})
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set())
  const [generatingReplies, setGeneratingReplies] = useState<Set<string>>(new Set())
  const [replyResponses, setReplyResponses] = useState<Record<string, string>>({})
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({})
  const [editingReplies, setEditingReplies] = useState<Set<string>>(new Set())
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>({})
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set())
  const [sendResults, setSendResults] = useState<Record<string, { success: boolean; message: string }>>({})
  
  // New state for enhanced functionality
  const [showTagTools, setShowTagTools] = useState<Set<string>>(new Set())
  const [newTags, setNewTags] = useState<Record<string, string>>({})
  const [savingTags, setSavingTags] = useState<Set<string>>(new Set())
  const [aiClassifying, setAiClassifying] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'flagged' | 'handled'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'sender' | 'subject'>('date')
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list')

  // Calculate email statistics
  const unreadCount = emails.filter(email => email.unread).length
  const flaggedCount = emails.filter(email => email.flag_status === 'flagged').length
  const handledCount = emails.filter(email => email.handled).length

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/sync-emails')
      if (response.ok) {
        window.location.reload()
      } else {
        console.error('Failed to sync emails')
      }
    } catch (error) {
      console.error('Error syncing emails:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const toggleEmailSelection = async (emailId: string, fromEmail: string | null) => {
    if (selectedEmail === emailId) {
      setSelectedEmail(null)
    } else {
      setSelectedEmail(emailId)
      
      // Fetch history if not already loaded
      if (!emailHistory[emailId] && fromEmail) {
        setLoadingHistory(prev => new Set(prev).add(emailId))
        try {
          const response = await fetch(`/api/email-history?from_email=${encodeURIComponent(fromEmail)}`)
          if (response.ok) {
            const history = await response.json()
            setEmailHistory(prev => ({
              ...prev,
              [emailId]: history.emails || []
            }))
          }
        } catch (error) {
          console.error('Error fetching email history:', error)
        } finally {
          setLoadingHistory(prev => {
            const newSet = new Set(prev)
            newSet.delete(emailId)
            return newSet
          })
        }
      }
    }
  }

  const handleGenerateReply = async (emailId: string, subject: string | null, bodyPreview: string | null) => {
    if (!subject && !bodyPreview) {
      setReplyErrors(prev => ({
        ...prev,
        [emailId]: 'No content available to generate reply from'
      }))
      return
    }

    setGeneratingReplies(prev => new Set(prev).add(emailId))
    setReplyErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[emailId]
      return newErrors
    })
    setReplyResponses(prev => {
      const newResponses = { ...prev }
      delete newResponses[emailId]
      return newResponses
    })

    try {
      const response = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: emailId,
          subject: subject,
          body: bodyPreview,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate reply')
      }

      const data = await response.json()
      const replyText = data.response || data.content || 'No response received'
      
      setReplyResponses(prev => ({
        ...prev,
        [emailId]: replyText
      }))
    } catch (error) {
      console.error('Error generating reply:', error)
      setReplyErrors(prev => ({
        ...prev,
        [emailId]: 'Failed to generate reply. Please try again.'
      }))
    } finally {
      setGeneratingReplies(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    }
  }

  const handleEditReply = (emailId: string) => {
    setEditingReplies(prev => new Set(prev).add(emailId))
    const currentReply = replyResponses[emailId] || ''
    setEditedReplies(prev => ({
      ...prev,
      [emailId]: currentReply
    }))
  }

  const handleSaveEdit = (emailId: string) => {
    setEditingReplies(prev => {
      const newSet = new Set(prev)
      newSet.delete(emailId)
      return newSet
    })
    const editedContent = editedReplies[emailId] || ''
    setReplyResponses(prev => ({
      ...prev,
      [emailId]: editedContent
    }))
  }

  const handleSendEmail = async (emailId: string, toEmail: string | null, subject: string | null) => {
    if (!toEmail) {
      setSendResults(prev => ({
        ...prev,
        [emailId]: { success: false, message: 'No recipient email available' }
      }))
      return
    }

    const replyContent = replyResponses[emailId] || editedReplies[emailId] || ''
    if (!replyContent.trim()) {
      setSendResults(prev => ({
        ...prev,
        [emailId]: { success: false, message: 'No reply content to send' }
      }))
      return
    }

    setSendingEmails(prev => new Set(prev).add(emailId))
    setSendResults(prev => {
      const newResults = { ...prev }
      delete newResults[emailId]
      return newResults
    })

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: emailId,
          draft: replyContent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      const data = await response.json()
      
      setSendResults(prev => ({
        ...prev,
        [emailId]: { success: true, message: 'Email sent successfully!' }
      }))

      setTimeout(() => {
        setReplyResponses(prev => {
          const newResponses = { ...prev }
          delete newResponses[emailId]
          return newResponses
        })
        setSendResults(prev => {
          const newResults = { ...prev }
          delete newResults[emailId]
          return newResults
        })
      }, 3000)

    } catch (error) {
      console.error('Error sending email:', error)
      setSendResults(prev => ({
        ...prev,
        [emailId]: { success: false, message: error instanceof Error ? error.message : 'Failed to send email' }
      }))
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    }
  }

  const toggleFlag = async (emailId: string, currentFlagStatus: string | null) => {
    setSavingTags(prev => new Set(prev).add(emailId))
    
    try {
      const newFlagStatus = currentFlagStatus === 'flagged' ? null : 'flagged'
      
      const { error } = await supabase
        .from('incoming_emails')
        .update({ flag_status: newFlagStatus })
        .eq('id', emailId)

      if (error) {
        console.error('Error updating flag status:', error)
      } else {
        // Update local state
        const updatedEmails = emails.map(email => 
          email.id === emailId 
            ? { ...email, flag_status: newFlagStatus }
            : email
        )
        // Note: In a real app, you'd update the parent component's state
      }
    } catch (error) {
      console.error('Error toggling flag:', error)
    } finally {
      setSavingTags(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    }
  }

  const addCategory = async (emailId: string) => {
    const newCategory = newTags[emailId]?.trim()
    if (!newCategory) return

    setSavingTags(prev => new Set(prev).add(emailId))
    
    try {
      const email = emails.find(e => e.id === emailId)
      const currentCategories = email?.categories || []
      const updatedCategories = [...currentCategories, newCategory]
      
      const { error } = await supabase
        .from('incoming_emails')
        .update({ categories: updatedCategories })
        .eq('id', emailId)

      if (error) {
        console.error('Error adding category:', error)
      } else {
        setNewTags(prev => {
          const newTags = { ...prev }
          delete newTags[emailId]
          return newTags
        })
        // Update local state
      }
    } catch (error) {
      console.error('Error adding category:', error)
    } finally {
      setSavingTags(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    }
  }

  const removeCategory = async (emailId: string, categoryToRemove: string) => {
    setSavingTags(prev => new Set(prev).add(emailId))
    
    try {
      const email = emails.find(e => e.id === emailId)
      const currentCategories = email?.categories || []
      const updatedCategories = currentCategories.filter(cat => cat !== categoryToRemove)
      
      const { error } = await supabase
        .from('incoming_emails')
        .update({ categories: updatedCategories })
        .eq('id', emailId)

      if (error) {
        console.error('Error removing category:', error)
      } else {
        // Update local state
      }
    } catch (error) {
      console.error('Error removing category:', error)
    } finally {
      setSavingTags(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    }
  }

  const toggleTagTools = (emailId: string) => {
    setShowTagTools(prev => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }

  const handleAiClassify = async (emailId: string, subject: string | null, bodyPreview: string | null) => {
    if (!subject && !bodyPreview) return

    setAiClassifying(prev => new Set(prev).add(emailId))
    
    try {
      const response = await fetch('/api/ai-classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: emailId,
          subject: subject,
          body: bodyPreview,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('AI classification result:', data)
        // Handle the classification result
      }
    } catch (error) {
      console.error('Error classifying email:', error)
    } finally {
      setAiClassifying(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  const getSenderInitials = (email: string | null) => {
    if (!email) return '?'
    const parts = email.split('@')[0].split('.')
    return parts.map(part => part.charAt(0).toUpperCase()).join('').slice(0, 2)
  }

  const getSenderName = (email: string | null) => {
    if (!email) return 'Unknown'
    return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Filter and sort emails
  const filteredEmails = emails
    .filter(email => {
      const matchesSearch = !searchTerm || 
        email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.from_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.body_preview?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterStatus === 'all' ||
        (filterStatus === 'unread' && email.unread) ||
        (filterStatus === 'flagged' && email.flag_status === 'flagged') ||
        (filterStatus === 'handled' && email.handled)
      
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'sender':
          return (a.from_email || '').localeCompare(b.from_email || '')
        case 'subject':
          return (a.subject || '').localeCompare(b.subject || '')
        case 'date':
        default:
          return new Date(b.received_at || '').getTime() - new Date(a.received_at || '').getTime()
      }
    })

  if (emails.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
        <p className="text-gray-500 mb-4">Your inbox is empty. Try syncing emails from Outlook.</p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 relative group"
          title="Sync Emails (Under Construction)"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Sync Emails'}
          <Construction className="h-3 w-3 absolute -top-1 -right-1 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails... (Under Construction)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <Construction className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-500" />
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all' ? 'bg-teal-100 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>All Emails</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                  {emails.length}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setFilterStatus('unread')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'unread' ? 'bg-teal-100 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Unread</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setFilterStatus('flagged')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'flagged' ? 'bg-teal-100 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Flagged</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                  {flaggedCount}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setFilterStatus('handled')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'handled' ? 'bg-teal-100 text-teal-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Handled</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                  {handledCount}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {filteredEmails.map((email) => {
              const isSelected = selectedEmail === email.id
              const history = emailHistory[email.id] || []
              const isLoadingHistory = loadingHistory.has(email.id)
              
              return (
                <div
                  key={email.id}
                  onClick={() => toggleEmailSelection(email.id, email.from_email)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-teal-50 border border-teal-200' 
                      : 'hover:bg-gray-100 border border-transparent'
                  } ${email.unread ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Sender Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-sm font-medium text-teal-700">
                        {getSenderInitials(email.from_email)}
                      </div>
                    </div>
                    
                    {/* Email Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium truncate ${
                          email.unread ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {getSenderName(email.from_email)}
                        </span>
                        <div className="flex items-center gap-1">
                          {email.flag_status === 'flagged' && (
                            <Flag className="h-3 w-3 text-orange-500" />
                          )}
                          {email.pinned && (
                            <Pin className="h-3 w-3 text-yellow-500" />
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDate(email.received_at)}
                          </span>
                        </div>
                      </div>
                      
                      <h4 className={`text-sm font-medium mb-1 truncate ${
                        email.unread ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {email.subject || 'No subject'}
                      </h4>
                      
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {email.body_preview || 'No preview available'}
                      </p>
                      
                      {/* Status indicators */}
                      <div className="flex items-center gap-1 mt-2">
                        {email.unread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        {email.handled && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                        {email.categories && email.categories.length > 0 && (
                          <div className="flex gap-1">
                            {email.categories.slice(0, 2).map((category, index) => (
                              <span
                                key={index}
                                className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs relative group"
                                title={`Category: ${category} (Under Construction)`}
                              >
                                {category}
                                <Construction className="h-2 w-2 absolute -top-0.5 -right-0.5 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedEmail ? (
          (() => {
            const email = emails.find(e => e.id === selectedEmail)
            if (!email) return null
            
            const history = emailHistory[email.id] || []
            const isLoadingHistory = loadingHistory.has(email.id)
            const isGeneratingReply = generatingReplies.has(email.id)
            const replyResponse = replyResponses[email.id]
            const replyError = replyErrors[email.id]
            const isEditingReply = editingReplies.has(email.id)
            const editedReply = editedReplies[email.id]
            const isSendingEmail = sendingEmails.has(email.id)
            const sendResult = sendResults[email.id]
            
            return (
              <>
                {/* Email Header */}
                <div className="p-6 border-b border-gray-200 bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-lg font-medium text-teal-700">
                        {getSenderInitials(email.from_email)}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">
                          {email.subject || 'No subject'}
                        </h2>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="font-medium">{email.from_email}</span>
                          <span>•</span>
                          <span>{formatDate(email.received_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFlag(email.id, email.flag_status)}
                        disabled={savingTags.has(email.id)}
                        className={`p-2 rounded-lg transition-colors relative group ${
                          email.flag_status === 'flagged'
                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={email.flag_status === 'flagged' ? 'Unflag' : 'Flag (Under Construction)'}
                      >
                        <Flag className="h-4 w-4" />
                        <Construction className="h-3 w-3 absolute -top-1 -right-1 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      
                      <button
                        onClick={() => handleGenerateReply(email.id, email.subject, email.body_preview)}
                        disabled={isGeneratingReply}
                        className="p-2 bg-teal-100 text-teal-600 rounded-lg hover:bg-teal-200 transition-colors disabled:opacity-50"
                        title="Generate AI Reply"
                      >
                        {isGeneratingReply ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </button>
                      
                      <button 
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors relative group"
                        title="Reply (Under Construction)"
                      >
                        <Reply className="h-4 w-4" />
                        <Construction className="h-3 w-3 absolute -top-1 -right-1 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      
                      <button 
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors relative group"
                        title="Forward (Under Construction)"
                      >
                        <Forward className="h-4 w-4" />
                        <Construction className="h-3 w-3 absolute -top-1 -right-1 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      
                      <button 
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors relative group"
                        title="More Options (Under Construction)"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <Construction className="h-3 w-3 absolute -top-1 -right-1 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Status and Categories */}
                  <div className="flex items-center gap-3">
                    {email.unread && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 relative group">
                        Unread
                        <Construction className="h-3 w-3 absolute -top-1 -right-1 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    )}
                    {email.handled && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 relative group">
                        Handled
                        <Construction className="h-3 w-3 absolute -top-1 -right-1 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    )}
                    {email.pinned && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 relative group">
                        Pinned
                        <Construction className="h-3 w-3 absolute -top-1 -right-1 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    )}
                    {email.categories && email.categories.length > 0 && (
                      <div className="flex gap-1">
                        {email.categories.map((category, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 relative group"
                            title={`Category: ${category} (Under Construction)`}
                          >
                            {category}
                            <Construction className="h-3 w-3 absolute -top-1 -right-1 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-4xl">
                    {/* Email Body */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <div className="prose max-w-none">
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {email.body_preview || 'No content available'}
                        </p>
                      </div>
                    </div>

                    {/* AI Reply Section */}
                    {replyResponse && (
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-teal-700">
                            <MessageSquare className="h-5 w-5" />
                            <span className="font-medium">AI Generated Reply</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isEditingReply ? (
                              <button
                                onClick={() => handleEditReply(email.id)}
                                className="p-2 text-teal-600 hover:text-teal-700 transition-colors"
                                title="Edit Reply"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSaveEdit(email.id)}
                                className="p-2 text-teal-600 hover:text-teal-700 transition-colors"
                                title="Save Changes"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {isEditingReply ? (
                          <textarea
                            value={editedReply || replyResponse}
                            onChange={(e) => setEditedReplies(prev => ({
                              ...prev,
                              [email.id]: e.target.value
                            }))}
                            className="w-full p-4 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                            rows={8}
                            placeholder="Edit your reply here..."
                          />
                        ) : (
                          <div className="bg-white p-4 rounded-lg border border-teal-200">
                            <div className="text-gray-800 whitespace-pre-wrap">
                              {replyResponse}
                            </div>
                          </div>
                        )}

                        {/* Send Email Button */}
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => handleSendEmail(email.id, email.from_email, email.subject)}
                            disabled={isSendingEmail}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 font-medium"
                          >
                            {isSendingEmail ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            {isSendingEmail ? 'Sending...' : 'Send Reply'}
                          </button>
                        </div>

                        {/* Send Result Message */}
                        {sendResult && (
                          <div className={`mt-4 p-4 rounded-lg ${
                            sendResult.success 
                              ? 'bg-green-50 border border-green-200 text-green-800' 
                              : 'bg-red-50 border border-red-200 text-red-800'
                          }`}>
                            {sendResult.message}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generate Reply Error */}
                    {replyError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                        <div className="flex items-center gap-2 text-red-700 mb-2">
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-medium">Error Generating Reply</span>
                        </div>
                        <div className="text-red-800">
                          {replyError}
                        </div>
                      </div>
                    )}

                    {/* Email History */}
                    {history.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <History className="h-5 w-5 text-teal-600" />
                          Correspondence History
                        </h3>
                        
                        {isLoadingHistory ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                            <span className="ml-2 text-gray-600">Loading history...</span>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {history.map((historicalEmail) => (
                              <div
                                key={historicalEmail.id}
                                className="bg-white rounded-lg p-4 border border-gray-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-gray-900">
                                    {historicalEmail.subject || 'No subject'}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {formatDate(historicalEmail.received_at)}
                                  </span>
                                </div>
                                <p className="text-gray-600 text-sm">
                                  {historicalEmail.body_preview || 'No preview available'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )
          })()
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an email</h3>
              <p className="text-gray-500">Choose an email from the list to view its details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 