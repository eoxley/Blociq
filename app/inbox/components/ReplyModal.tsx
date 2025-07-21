'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, 
  Send, 
  Loader2, 
  Reply, 
  ReplyAll, 
  Forward,
  User,
  Users,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

type ReplyAction = 'reply' | 'replyAll' | 'forward'

interface ReplyModalProps {
  isOpen: boolean
  onClose: () => void
  email: Email
  action: ReplyAction
  onEmailSent?: () => void
}

export default function ReplyModal({
  isOpen,
  onClose,
  email,
  action,
  onEmailSent
}: ReplyModalProps) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Initialize form based on action type
  useEffect(() => {
    if (!isOpen) return

    const originalSubject = email.subject || 'No Subject'
    const originalBody = email.body_full || email.body_preview || ''
    const senderEmail = email.from_email || ''
    const senderName = email.from_name || ''

    switch (action) {
      case 'reply':
        setTo(senderEmail)
        setCc('')
        setSubject(`Re: ${originalSubject}`)
        setBody('')
        break
      
      case 'replyAll':
        setTo(senderEmail)
        setCc('') // In a real implementation, you'd get CC from the original email
        setSubject(`Re: ${originalSubject}`)
        setBody('')
        break
      
      case 'forward':
        setTo('')
        setCc('')
        setSubject(`Fwd: ${originalSubject}`)
        setBody(`\n\n---------- Forwarded message ----------\nFrom: ${senderName} <${senderEmail}>\nDate: ${new Date(email.received_at || '').toLocaleString()}\nSubject: ${originalSubject}\n\n${originalBody}`)
        break
    }
  }, [isOpen, action, email])

  const handleGenerateDraft = async () => {
    if (action === 'forward') return // Don't generate draft for forwards
    
    setIsGeneratingDraft(true)
    try {
      const response = await fetch('/api/generate-email-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: email.id,
          subject: email.subject,
          body: email.body_full || email.body_preview,
          buildingContext: email.buildings?.name,
          tags: email.tags || []
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setBody(data.draft || '')
        toast.success('AI draft generated successfully')
      } else {
        toast.error('Failed to generate draft')
      }
    } catch (error) {
      console.error('Error generating draft:', error)
      toast.error('Failed to generate draft')
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to.split(',').map(email => email.trim()),
          cc: cc ? cc.split(',').map(email => email.trim()) : [],
          subject,
          body,
          replyTo: email.from_email
        }),
      })

      if (response.ok) {
        toast.success('Email sent successfully')
        onEmailSent?.()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
    } finally {
      setIsSending(false)
    }
  }

  const getActionIcon = () => {
    switch (action) {
      case 'reply':
        return <Reply className="h-4 w-4" />
      case 'replyAll':
        return <ReplyAll className="h-4 w-4" />
      case 'forward':
        return <Forward className="h-4 w-4" />
    }
  }

  const getActionTitle = () => {
    switch (action) {
      case 'reply':
        return 'Reply'
      case 'replyAll':
        return 'Reply All'
      case 'forward':
        return 'Forward'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getActionIcon()}
              {getActionTitle()}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Original Email Context */}
          <div className="bg-gray-50 rounded-lg p-3 mt-3">
            <div className="text-sm text-gray-600">
              <strong>Original:</strong> {email.subject || 'No Subject'}
            </div>
            <div className="text-sm text-gray-600">
              <strong>From:</strong> {email.from_name || email.from_email}
            </div>
            {email.buildings?.name && (
              <div className="text-sm text-gray-600">
                <strong>Building:</strong> {email.buildings.name}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {/* To Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To <span className="text-red-500">*</span>
            </label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              disabled={isSending}
            />
          </div>

          {/* CC Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CC
            </label>
            <Input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com (optional)"
              disabled={isSending}
            />
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              disabled={isSending}
            />
          </div>

          {/* Body Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Message <span className="text-red-500">*</span>
              </label>
              {action !== 'forward' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDraft}
                  disabled={isGeneratingDraft || isSending}
                  className="text-xs"
                >
                  {isGeneratingDraft ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <span className="mr-1">🧠</span>
                  )}
                  {isGeneratingDraft ? 'Generating...' : 'AI Draft'}
                </Button>
              )}
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[200px] resize-none"
              disabled={isSending}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !to.trim() || !subject.trim() || !body.trim()}
              className="flex items-center gap-2"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 