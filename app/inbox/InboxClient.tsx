'use client'

import { useState } from 'react'
import { Mail, Clock, User, RefreshCw, ExternalLink, ChevronDown, ChevronUp, History, MessageSquare, Loader2, Send, Edit3, Check, Tag, Flag } from 'lucide-react'
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
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set())
  const [emailHistory, setEmailHistory] = useState<Record<string, Email[]>>({})
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set())
  const [generatingReplies, setGeneratingReplies] = useState<Set<string>>(new Set())
  const [replyResponses, setReplyResponses] = useState<Record<string, string>>({})
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({})
  const [editingReplies, setEditingReplies] = useState<Set<string>>(new Set())
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>({})
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set())
  const [sendResults, setSendResults] = useState<Record<string, { success: boolean; message: string }>>({})
  
  // New state for tagging and flagging
  const [showTagTools, setShowTagTools] = useState<Set<string>>(new Set())
  const [newTags, setNewTags] = useState<Record<string, string>>({})
  const [savingTags, setSavingTags] = useState<Set<string>>(new Set())
  const [aiClassifying, setAiClassifying] = useState<Set<string>>(new Set())



  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/sync-emails')
      if (response.ok) {
        // Reload the page to show updated emails
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

  const toggleEmailExpansion = async (emailId: string, fromEmail: string | null) => {
    if (!fromEmail) return

    const isExpanded = expandedEmails.has(emailId)
    
    if (isExpanded) {
      // Collapse
      setExpandedEmails(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    } else {
      // Expand and fetch history
      setExpandedEmails(prev => new Set(prev).add(emailId))
      setLoadingHistory(prev => new Set(prev).add(emailId))

      try {
        const response = await fetch(`/api/email-history?from_email=${encodeURIComponent(fromEmail)}`)
        if (response.ok) {
          const history = await response.json()
          setEmailHistory(prev => ({
            ...prev,
            [emailId]: history.emails || []
          }))
        } else {
          console.error('Failed to fetch email history')
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
    // Initialize edited reply with current response
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
    // Update the reply response with edited content
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

      // Clear the reply after successful send
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
        [emailId]: { 
          success: false, 
          message: error instanceof Error ? error.message : 'Failed to send email. Please try again.' 
        }
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
      const nextFlag = currentFlagStatus === 'flagged' ? 'notFlagged' : 'flagged'
      const { error } = await supabase
        .from('incoming_emails')
        .update({ flag_status: nextFlag })
        .eq('id', emailId)
      
      if (error) {
        console.error('Error updating flag status:', error)
        return
      }
      
      // Reload the page to show updated emails
      window.location.reload()
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
    const newTag = newTags[emailId]?.trim()
    if (!newTag) return

    setSavingTags(prev => new Set(prev).add(emailId))
    
    try {
      // Get current categories
      const currentEmail = emails.find(e => e.id === emailId)
      const currentCategories = currentEmail?.categories || []
      
      // Add new category if it doesn't exist
      if (!currentCategories.includes(newTag)) {
        const updatedCategories = [...currentCategories, newTag]
        
        const { error } = await supabase
          .from('incoming_emails')
          .update({ categories: updatedCategories })
          .eq('id', emailId)
        
        if (error) {
          console.error('Error adding category:', error)
          return
        }
        
        // Clear the input and hide tools
        setNewTags(prev => {
          const newTags = { ...prev }
          delete newTags[emailId]
          return newTags
        })
        setShowTagTools(prev => {
          const newSet = new Set(prev)
          newSet.delete(emailId)
          return newSet
        })
        
        // Reload the page to show updated emails
        window.location.reload()
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
      const currentEmail = emails.find(e => e.id === emailId)
      const currentCategories = currentEmail?.categories || []
      const updatedCategories = currentCategories.filter(cat => cat !== categoryToRemove)
      
      const { error } = await supabase
        .from('incoming_emails')
        .update({ categories: updatedCategories })
        .eq('id', emailId)
      
      if (error) {
        console.error('Error removing category:', error)
        return
      }
      
      // Reload the page to show updated emails
      window.location.reload()
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
        // Clear the input when hiding
        setNewTags(prev => {
          const newTags = { ...prev }
          delete newTags[emailId]
          return newTags
        })
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }

  const handleAiClassify = async (emailId: string, subject: string | null, bodyPreview: string | null) => {
    if (!subject && !bodyPreview) {
      console.error('No content available for AI classification')
      return
    }

    setAiClassifying(prev => new Set(prev).add(emailId))

    try {
      const response = await fetch('/api/ai-classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject || '',
          body: bodyPreview || ''
        })
      })

      if (!response.ok) {
        throw new Error('Failed to classify email')
      }

      const result = await response.json()
      
      if (result.success && result.tags?.length > 0) {
        // Get current email data
        const currentEmail = emails.find(e => e.id === emailId)
        if (!currentEmail) return

        // Merge AI tags with existing categories
        const existingCategories = currentEmail.categories || []
        const aiTags = result.tags || []
        const mergedCategories = [...new Set([...existingCategories, ...aiTags])]
        
        // Update the email with AI classification
        const { error } = await supabase
          .from('incoming_emails')
          .update({ 
            categories: mergedCategories,
            flag_status: result.confidence >= 80 && result.flag_status === 'flagged' ? 'flagged' : currentEmail.flag_status
          })
          .eq('id', emailId)
        
        if (error) {
          console.error('Error updating email with AI classification:', error)
          return
        }
        
        // Reload the page to show updated data
        window.location.reload()
      }
    } catch (error) {
      console.error('Error in AI classification:', error)
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

  if (emails.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
        <p className="text-gray-500 mb-4">Your inbox is empty. Try syncing emails from Outlook.</p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Sync Emails'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-teal-600" />
          <span className="text-sm text-gray-600">
            {emails.length} email{emails.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {/* Email List */}
      <div className="space-y-3">
        {emails.map((email) => {
          const isExpanded = expandedEmails.has(email.id)
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
            <div
              key={email.id}
              className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
                email.unread ? 'border-l-4 border-l-teal-500' : 'border-gray-200'
              } ${email.pinned ? 'bg-yellow-50 border-yellow-200' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Email Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {email.from_email || 'Unknown sender'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(email.received_at)}</span>
                    </div>
                  </div>

                  {/* Subject */}
                  <h3 className={`font-medium mb-1 ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                    {email.subject || 'No subject'}
                  </h3>

                  {/* Preview */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {email.body_preview || 'No preview available'}
                  </p>

                  {/* Status indicators */}
                  <div className="flex items-center gap-2 mt-2">
                    {email.unread && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        Unread
                      </span>
                    )}
                    {email.handled && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Handled
                      </span>
                    )}
                    {email.pinned && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pinned
                      </span>
                    )}
                    {email.flag_status === 'flagged' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        📌 Flagged
                      </span>
                    )}
                  </div>

                  {/* Categories */}
                  {email.categories && email.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {email.categories.map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 group relative"
                        >
                          {category}
                          <button
                            onClick={() => removeCategory(email.id, category)}
                            disabled={savingTags.has(email.id)}
                            className="ml-1 text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                            title="Remove category"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tag and Flag Tools */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => toggleFlag(email.id, email.flag_status)}
                      disabled={savingTags.has(email.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                        email.flag_status === 'flagged'
                          ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={email.flag_status === 'flagged' ? 'Unflag email' : 'Flag email'}
                    >
                      <Flag className="h-3 w-3" />
                      {savingTags.has(email.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : email.flag_status === 'flagged' ? (
                        'Unflag'
                      ) : (
                        'Flag'
                      )}
                    </button>

                    <button
                      onClick={() => toggleTagTools(email.id)}
                      disabled={savingTags.has(email.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                      title="Edit tags"
                    >
                      <Tag className="h-3 w-3" />
                      {showTagTools.has(email.id) ? 'Cancel' : 'Edit Tags'}
                    </button>

                    <button
                      onClick={() => handleAiClassify(email.id, email.subject, email.body_preview)}
                      disabled={aiClassifying.has(email.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors disabled:opacity-50"
                      title="AI Classify"
                    >
                      {aiClassifying.has(email.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        '🧠 AI'
                      )}
                      {aiClassifying.has(email.id) ? 'Classifying...' : 'Classify'}
                    </button>
                  </div>

                  {/* Add Tag Input */}
                  {showTagTools.has(email.id) && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add category"
                        value={newTags[email.id] || ''}
                        onChange={(e) => setNewTags(prev => ({
                          ...prev,
                          [email.id]: e.target.value
                        }))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addCategory(email.id)
                          }
                        }}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        disabled={savingTags.has(email.id)}
                      />
                      <button
                        onClick={() => addCategory(email.id)}
                        disabled={savingTags.has(email.id) || !newTags[email.id]?.trim()}
                        className="bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingTags.has(email.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Add'
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="ml-4 flex items-center gap-2">
                  <button 
                    onClick={() => toggleEmailExpansion(email.id, email.from_email)}
                    className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                    title="View History"
                  >
                    <History className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleGenerateReply(email.id, email.subject, email.body_preview)}
                    disabled={isGeneratingReply}
                    className="p-2 text-gray-400 hover:text-teal-600 transition-colors disabled:opacity-50"
                    title="Generate Reply"
                  >
                    {isGeneratingReply ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </button>
                  <button className="p-2 text-gray-400 hover:text-teal-600 transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Generate Reply Response */}
              {replyResponse && (
                <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-teal-700">
                      <MessageSquare className="h-4 w-4" />
                      AI Generated Reply
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditingReply ? (
                        <button
                          onClick={() => handleEditReply(email.id)}
                          className="p-1 text-teal-600 hover:text-teal-700 transition-colors"
                          title="Edit Reply"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSaveEdit(email.id)}
                          className="p-1 text-teal-600 hover:text-teal-700 transition-colors"
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
                      className="w-full p-3 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                      rows={6}
                      placeholder="Edit your reply here..."
                    />
                  ) : (
                    <div className="text-gray-800 whitespace-pre-wrap text-sm">
                      {replyResponse}
                    </div>
                  )}

                  {/* Send Email Button */}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleSendEmail(email.id, email.from_email, email.subject)}
                      disabled={isSendingEmail}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {isSendingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {isSendingEmail ? 'Sending...' : 'Send'}
                    </button>
                  </div>

                  {/* Send Result Message */}
                  {sendResult && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${
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
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-red-700 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    Error Generating Reply
                  </div>
                  <div className="text-red-800 text-sm">
                    {replyError}
                  </div>
                </div>
              )}

              {/* Collapsible History Section */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <History className="h-4 w-4 text-teal-600" />
                      Correspondence History
                    </h4>
                    <button
                      onClick={() => toggleEmailExpansion(email.id, email.from_email)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </div>

                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading history...</span>
                    </div>
                  ) : history.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {history.map((historicalEmail) => (
                        <div
                          key={historicalEmail.id}
                          className="bg-gray-50 rounded-lg p-3 border-l-2 border-gray-300"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">
                              {historicalEmail.subject || 'No subject'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(historicalEmail.received_at)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {historicalEmail.body_preview || 'No preview available'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No previous messages from this sender</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
} 