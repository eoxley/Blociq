'use client'

import React, { useState } from 'react'
import { Clock, User, Building, Mail, PenTool, Loader2, Reply, ReplyAll, Forward, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import ReplyEditor from './ReplyEditor'
import ReplyModal from './ReplyModal'
import { toast } from 'sonner'

interface Email {
  id: string
  subject: string | null
  from_name: string | null
  from_email: string | null
  received_at: string | null
  body_preview: string | null
  body_full: string | null
  building_id: string | null
  is_read: boolean | null
  is_handled: boolean | null
  tags: string[] | null
  outlook_id: string | null
  buildings?: { name: string } | null
}

interface EmailDetailProps {
  email: Email
  onEmailDeleted?: () => void
}

export default function EmailDetail({ email, onEmailDeleted }: EmailDetailProps) {
  const [isDraftingReply, setIsDraftingReply] = useState(false)
  const [showReplyEditor, setShowReplyEditor] = useState(false)
  const [draftReply, setDraftReply] = useState<string>('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [replyModalState, setReplyModalState] = useState<{
    isOpen: boolean
    action: 'reply' | 'replyAll' | 'forward'
  }>({ isOpen: false, action: 'reply' })
  const [isDeleting, setIsDeleting] = useState(false)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSenderInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.split('@')[0].slice(0, 2).toUpperCase()
    }
    return '??'
  }



  const handleDraftReply = async () => {
    setIsDraftingReply(true)
    try {
      const response = await fetch('/api/generate-email-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_id: email.id,
          building_id: email.building_id
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setDraftReply(result.draft)
        setShowReplyEditor(true)
        toast.success('Reply draft generated')
      } else {
        toast.error(result.error || 'Failed to generate reply draft')
      }
    } catch (error) {
      console.error('Error generating reply draft:', error)
      toast.error('Failed to generate reply draft')
    } finally {
      setIsDraftingReply(false)
    }
  }

  const handleSendReply = async (content: string) => {
    setIsSendingReply(true)
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: email.id,
          draft: content,
          buildingId: email.building_id
        }),
      })

      const result = await response.json()

      if (response.ok && result.status === 'sent') {
        toast.success('Reply sent successfully')
        setShowReplyEditor(false)
        setDraftReply('')
        // Optionally refresh the inbox or mark email as handled
      } else {
        toast.error(result.message || 'Failed to send reply')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error('Failed to send reply')
    } finally {
      setIsSendingReply(false)
    }
  }

  const handleCancelReply = () => {
    setShowReplyEditor(false)
    setDraftReply('')
  }

  // Email action handlers
  const handleReply = () => {
    setReplyModalState({ isOpen: true, action: 'reply' })
  }

  const handleReplyAll = () => {
    setReplyModalState({ isOpen: true, action: 'replyAll' })
  }

  const handleForward = () => {
    setReplyModalState({ isOpen: true, action: 'forward' })
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this email? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/mark-deleted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: email.id
        }),
      })

      if (response.ok) {
        toast.success('Email deleted successfully')
        onEmailDeleted?.()
      } else {
        toast.error('Failed to delete email')
      }
    } catch (error) {
      console.error('Error deleting email:', error)
      toast.error('Failed to delete email')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEmailSent = () => {
    // Refresh or update the email list
    onEmailDeleted?.() // Reuse the same callback to refresh
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Email Header */}
      <div className="p-6 border-b bg-gray-50">
        <div className="flex items-start gap-4">
          {/* Sender Avatar */}
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-medium">
            {getSenderInitials(email.from_name, email.from_email)}
          </div>

          {/* Email Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {email.subject || 'No Subject'}
              </h1>
              
              {/* Email Action Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  onClick={handleReply}
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-blue-100 rounded-full"
                  title="Reply"
                >
                  <Reply className="w-4 h-4 text-gray-600" />
                </Button>
                <Button
                  onClick={handleReplyAll}
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-blue-100 rounded-full"
                  title="Reply All"
                >
                  <ReplyAll className="w-4 h-4 text-gray-600" />
                </Button>
                <Button
                  onClick={handleForward}
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-blue-100 rounded-full"
                  title="Forward"
                >
                  <Forward className="w-4 h-4 text-gray-600" />
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-red-100 rounded-full"
                  title="Delete"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-600" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  {email.from_name || 'Unknown Sender'}
                </span>
                {email.from_email && (
                  <>
                    <span>•</span>
                    <span className="text-gray-500">{email.from_email}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatDate(email.received_at)}</span>
              </div>

              {email.buildings?.name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building className="h-4 w-4" />
                  <span>{email.buildings.name}</span>
                </div>
              )}
            </div>

            {/* Draft Reply Button */}
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleDraftReply}
                disabled={isDraftingReply}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {isDraftingReply ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PenTool className="h-4 w-4" />
                )}
                {isDraftingReply ? 'Drafting...' : '✍️ Draft Reply'}
              </Button>
            </div>

            {/* Reply Editor */}
            {showReplyEditor && (
              <ReplyEditor
                originalEmail={email}
                draftContent={draftReply}
                onCancel={handleCancelReply}
                onSend={handleSendReply}
                isSending={isSendingReply}
              />
            )}
          </div>

          {/* Status Badges */}
          <div className="flex flex-col gap-2">
            {!email.is_read && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Unread
              </Badge>
            )}
            
            {email.is_handled && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Handled
              </Badge>
            )}
            
            {email.tags && email.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {email.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {email.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{email.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-sm max-w-none">
          {email.body_full ? (
            <div 
              className="text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: email.body_full.replace(/\n/g, '<br>') 
              }}
            />
          ) : (
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {email.body_preview || 'No content available'}
            </div>
          )}
        </div>

        {/* Email Metadata */}
        <Separator className="my-6" />
        
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3" />
            <span>Outlook ID: {email.outlook_id || 'Not available'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Email ID: {email.id}</span>
          </div>
          {email.building_id && (
            <div className="flex items-center gap-2">
              <Building className="h-3 w-3" />
              <span>Building ID: {email.building_id}</span>
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {replyModalState.isOpen && (
        <ReplyModal
          mode={replyModalState.action}
          onClose={() => setReplyModalState({ isOpen: false, action: 'reply' })}
          email={email}
          onEmailSent={handleEmailSent}
        />
      )}
    </div>
  )
} 