'use client'

import { useState, useMemo } from 'react'
import { 
  Mail, Clock, User, RefreshCw, ExternalLink, ChevronDown, ChevronUp, History, 
  MessageSquare, Loader2, Send, Edit3, Check, Tag, Flag, Search, Filter, 
  Archive, Trash2, Star, MoreHorizontal, Reply, Forward, Delete, Pin, 
  Eye, EyeOff, Calendar, Building, AlertCircle, CheckCircle, Clock as ClockIcon,
  Wrench, Construction, Home, Save, X, Plus
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import EmailAssignmentDropdowns from './components/EmailAssignmentDropdowns'
import EmailDetailView from './components/EmailDetailView'

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
  building_id: number | null
  unit_id: number | null
  leaseholder_id: string | null
  buildings?: { name: string } | null
  units?: { unit_number: string } | null
  leaseholders?: { name: string; email: string } | null
}

interface InboxClientProps {
  emails: Email[]
}

export default function InboxClient({ emails }: InboxClientProps) {
  console.log('🎨 InboxClient: Rendering component...')
  console.log('📧 Emails data:', emails)
  
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

  // Email assignment state
  const [showAssignmentDropdowns, setShowAssignmentDropdowns] = useState<Set<string>>(new Set())
  const [emailAssignments, setEmailAssignments] = useState<Record<string, {
    buildingId: number | null;
    unitId: number | null;
    leaseholderId: string | null;
    assignmentLabel: string;
  }>>({})

  // Calculate email statistics
  const unreadCount = emails.filter(email => email.unread).length
  const flaggedCount = emails.filter(email => email.flag_status === 'flagged').length
  const handledCount = emails.filter(email => email.handled).length

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/sync-inbox')
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
      return
    }

    setSelectedEmail(emailId)
    
    // Load email history if not already loaded
    if (!emailHistory[emailId]) {
      setLoadingHistory(prev => new Set(prev).add(emailId))
      try {
        const response = await fetch(`/api/email-history?email=${encodeURIComponent(fromEmail || '')}`)
        if (response.ok) {
          const historyData = await response.json()
          setEmailHistory(prev => ({
            ...prev,
            [emailId]: historyData.emails || []
          }))
        }
      } catch (error) {
        console.error('Error loading email history:', error)
      } finally {
        setLoadingHistory(prev => {
          const newSet = new Set(prev)
          newSet.delete(emailId)
          return newSet
        })
      }
    }
  }

  const handleGenerateReply = async (emailId: string, subject: string | null, bodyPreview: string | null) => {
    setGeneratingReplies(prev => new Set(prev).add(emailId))
    setReplyErrors(prev => ({ ...prev, [emailId]: '' }))
    
    try {
      const response = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject || '',
          body: bodyPreview || '',
          emailId: emailId
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setReplyResponses(prev => ({
          ...prev,
          [emailId]: data.reply || 'No reply generated'
        }))
      } else {
        const errorData = await response.json()
        setReplyErrors(prev => ({
          ...prev,
          [emailId]: errorData.error || 'Failed to generate reply'
        }))
      }
    } catch (error) {
      setReplyErrors(prev => ({
        ...prev,
        [emailId]: 'Network error while generating reply'
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
  }

  const handleSaveEdit = (emailId: string) => {
    setEditingReplies(prev => {
      const newSet = new Set(prev)
      newSet.delete(emailId)
      return newSet
    })
    
    // Update the reply response with the edited version
    const editedReply = editedReplies[emailId]
    if (editedReply) {
      setReplyResponses(prev => ({
        ...prev,
        [emailId]: editedReply
      }))
    }
  }

  const handleSendEmail = async (emailId: string, toEmail: string | null, subject: string | null) => {
    setSendingEmails(prev => new Set(prev).add(emailId))
    setSendResults(prev => ({ ...prev, [emailId]: { success: false, message: '' } }))
    
    try {
      const replyContent = editedReplies[emailId] || replyResponses[emailId]
      
      const response = await fetch('/api/send-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: toEmail,
          subject: subject ? `Re: ${subject}` : 'Re: Your email',
          body: replyContent,
          originalEmailId: emailId
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSendResults(prev => ({
          ...prev,
          [emailId]: { success: true, message: data.message || 'Email sent successfully!' }
        }))
        
        // Clear the reply after successful send
        setTimeout(() => {
          setReplyResponses(prev => {
            const newResponses = { ...prev }
            delete newResponses[emailId]
            return newResponses
          })
          setEditedReplies(prev => {
            const newReplies = { ...prev }
            delete newReplies[emailId]
            return newReplies
          })
          setSendResults(prev => {
            const newResults = { ...prev }
            delete newResults[emailId]
            return newResults
          })
        }, 3000)
      } else {
        const errorData = await response.json()
        setSendResults(prev => ({
          ...prev,
          [emailId]: { success: false, message: errorData.error || 'Failed to send email' }
        }))
      }
    } catch (error) {
      setSendResults(prev => ({
        ...prev,
        [emailId]: { success: false, message: 'Network error while sending email' }
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
    const newFlagStatus = currentFlagStatus === 'flagged' ? null : 'flagged'
    
    try {
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
        // For now, we'll just log the change
        console.log('Flag status updated for email:', emailId, newFlagStatus)
      }
    } catch (error) {
      console.error('Error toggling flag:', error)
    }
  }

  const addCategory = async (emailId: string) => {
    const newTag = newTags[emailId]?.trim()
    if (!newTag) return

    setSavingTags(prev => new Set(prev).add(emailId))
    
    try {
      const email = emails.find(e => e.id === emailId)
      const currentCategories = email?.categories || []
      const updatedCategories = [...currentCategories, newTag]

      const { error } = await supabase
        .from('incoming_emails')
        .update({ categories: updatedCategories })
        .eq('id', emailId)

      if (error) {
        console.error('Error adding category:', error)
      } else {
        setNewTags(prev => ({ ...prev, [emailId]: '' }))
        // Update local state
        console.log('Category added for email:', emailId, newTag)
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
        console.log('Category removed for email:', emailId, categoryToRemove)
      }
    } catch (error) {
      console.error('Error removing category:', error)
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
    setAiClassifying(prev => new Set(prev).add(emailId))
    
    try {
      const response = await fetch('/api/ai-classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject || '',
          body: bodyPreview || '',
          emailId: emailId
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('AI classification result:', data)
        // Handle the classification result
      } else {
        console.error('Failed to classify email')
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

  const handleAssignmentChange = (emailId: string, assignment: {
    buildingId: number | null;
    unitId: number | null;
    leaseholderId: string | null;
    assignmentLabel: string;
  }) => {
    setEmailAssignments(prev => ({
      ...prev,
      [emailId]: assignment
    }))
    
    // Here you would typically update the database
    console.log('Assignment updated for email:', emailId, assignment)
  }

  const toggleAssignmentDropdowns = (emailId: string) => {
    setShowAssignmentDropdowns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }

  const getAssignmentLabel = (email: Email) => {
    if (email.building_id && email.buildings?.name) {
      return email.buildings.name
    }
    if (email.unit_id && email.units?.unit_number) {
      return `Unit ${email.units.unit_number}`
    }
    if (email.leaseholder_id && email.leaseholders?.name) {
      return email.leaseholders.name
    }
    return 'Unassigned'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short' 
      })
    } else {
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short' 
      })
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
  const filteredEmails = useMemo(() => {
    return emails
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
  }, [emails, searchTerm, filterStatus, sortBy])

  if (emails.length === 0) {
    console.log('❌ InboxClient: Rendering error state')
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Mail className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">No emails found</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your inbox is empty. Emails will appear here once they are synced from your connected account.
          </p>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Sync Emails'}
          </button>
        </div>
      </div>
    )
  }

  try {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Inbox</h1>
            <p className="text-gray-600 mt-2">Triage and respond to incoming emails with AI assistance</p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Sync'}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails by subject, sender, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              <option value="all">All ({emails.length})</option>
              <option value="unread">Unread ({unreadCount})</option>
              <option value="flagged">Flagged ({flaggedCount})</option>
              <option value="handled">Handled ({handledCount})</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              <option value="date">Date</option>
              <option value="sender">Sender</option>
              <option value="subject">Subject</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Email List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Recent Emails</h2>
              <p className="text-sm text-gray-600 mt-1">{filteredEmails.length} emails</p>
            </div>
            
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredEmails.map((email) => {
                const isSelected = selectedEmail === email.id
                
                return (
                  <div
                    key={email.id}
                    onClick={() => toggleEmailSelection(email.id, email.from_email)}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 ${
                      isSelected ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                    } ${email.unread ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {getSenderInitials(email.from_email)}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium truncate ${
                            email.unread ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {getSenderName(email.from_email)}
                          </span>
                          <div className="flex items-center gap-2">
                            {email.flag_status === 'flagged' && (
                              <Flag className="h-4 w-4 text-orange-500" />
                            )}
                            <span className="text-xs text-gray-500">
                              {formatDate(email.received_at)}
                            </span>
                          </div>
                        </div>
                        
                        <h3 className={`font-medium mb-2 line-clamp-2 ${
                          email.unread ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {email.subject || 'No subject'}
                        </h3>
                        
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {email.body_preview || 'No preview available'}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          {email.unread && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          {email.handled && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                            {getAssignmentLabel(email)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div className="lg:col-span-2">
          {selectedEmail ? (
            <EmailDetailView 
              email={emails.find(e => e.id === selectedEmail)!}
              emailHistory={emailHistory[selectedEmail] || []}
              isLoadingHistory={loadingHistory.has(selectedEmail)}
              isGeneratingReply={generatingReplies.has(selectedEmail)}
              replyResponse={replyResponses[selectedEmail]}
              replyError={replyErrors[selectedEmail]}
              isEditingReply={editingReplies.has(selectedEmail)}
              editedReply={editedReplies[selectedEmail]}
              isSendingEmail={sendingEmails.has(selectedEmail)}
              sendResult={sendResults[selectedEmail]}
              onToggleFlag={toggleFlag}
              onGenerateReply={handleGenerateReply}
              onEditReply={handleEditReply}
              onSaveEdit={handleSaveEdit}
              onSendEmail={handleSendEmail}
              onCancelReply={() => {
                setReplyResponses(prev => {
                  const newResponses = { ...prev }
                  delete newResponses[selectedEmail]
                  return newResponses
                })
                setEditedReplies(prev => {
                  const newReplies = { ...prev }
                  delete newReplies[selectedEmail]
                  return newReplies
                })
              }}
              onUpdateEditedReply={(value) => setEditedReplies(prev => ({
                ...prev,
                [selectedEmail]: value
              }))}
              getSenderInitials={getSenderInitials}
              formatDate={formatDate}
              getAssignmentLabel={getAssignmentLabel}
            />
          ) : (
            /* Empty State */
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Mail className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Select an email</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Choose an email from the list to view its details and generate AI-powered replies
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
  } catch (error) {
    console.error('❌ InboxClient: Rendering error:', error)
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Error loading inbox</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            There was an error loading the inbox. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh Page
          </button>
        </div>
      </div>
    )
  }
} 