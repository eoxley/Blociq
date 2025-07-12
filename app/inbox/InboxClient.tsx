'use client'

import { useState } from 'react'
import { Mail, Clock, User, RefreshCw, ExternalLink, ChevronDown, ChevronUp, History, MessageSquare, Loader2 } from 'lucide-react'

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
      const response = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Generate a professional reply to this email:\n\nSubject: ${subject || 'No subject'}\n\nContent: ${bodyPreview || 'No content available'}\n\nPlease provide a courteous and professional response.`,
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
                  </div>
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
                  <div className="flex items-center gap-2 text-sm text-teal-700 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    AI Generated Reply
                  </div>
                  <div className="text-gray-800 whitespace-pre-wrap text-sm">
                    {replyResponse}
                  </div>
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