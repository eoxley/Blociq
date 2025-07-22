'use client'

import React, { useState } from 'react'
import { 
  MessageSquare, 
  Brain, 
  Tag, 
  Calendar, 
  CheckSquare, 
  Check,
  Loader2,
  Send,
  Edit3,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

interface AIActionBarProps {
  email: Email
  onMarkHandled: () => void
}

export default function AIActionBar({ email, onMarkHandled }: AIActionBarProps) {
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [isCreatingTodo, setIsCreatingTodo] = useState(false)
  const [showReplyDraft, setShowReplyDraft] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Generate AI draft reply
  const handleGenerateReply = async () => {
    setIsGeneratingReply(true)
    setError(null)
    
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

      if (!response.ok) {
        throw new Error('Failed to generate reply')
      }

      const data = await response.json()
      setReplyDraft(data.draft || 'No reply generated')
      setShowReplyDraft(true)
    } catch (err) {
      console.error('Error generating reply:', err)
      setError('Failed to generate reply. Please try again.')
    } finally {
      setIsGeneratingReply(false)
    }
  }

  // Summarise email
  const handleSummarise = async () => {
    setIsSummarizing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/summarise-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: email.id,
          subject: email.subject,
          body: email.body_full || email.body_preview,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to summarise email')
      }

      const data = await response.json()
      setSummary(data.summary || 'No summary generated')
    } catch (err) {
      console.error('Error summarising email:', err)
      setError('Failed to summarise email. Please try again.')
    } finally {
      setIsSummarizing(false)
    }
  }

  // Create calendar event
  const handleCreateEvent = async () => {
    setIsCreatingEvent(true)
    setError(null)
    
    try {
      const response = await fetch('/api/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Follow up: ${email.subject}`,
          date: new Date().toISOString().split('T')[0], // Today
          building: email.buildings?.name || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      const data = await response.json()
      if (data.success) {
        // Show success feedback
        console.log('Event created successfully:', data.event)
      }
    } catch (err) {
      console.error('Error creating event:', err)
      setError('Failed to create event. Please try again.')
    } finally {
      setIsCreatingEvent(false)
    }
  }

  // Create todo
  const handleCreateTodo = async () => {
    setIsCreatingTodo(true)
    setError(null)
    
    try {
      const response = await fetch('/api/building-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Follow up: ${email.subject}`,
          description: `Email from ${email.from_name || email.from_email}: ${email.body_preview}`,
          building_id: email.building_id,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
          priority: 'medium',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create todo')
      }

      const data = await response.json()
      if (data.success) {
        // Show success feedback
        console.log('Todo created successfully:', data.task)
      }
    } catch (err) {
      console.error('Error creating todo:', err)
      setError('Failed to create todo. Please try again.')
    } finally {
      setIsCreatingTodo(false)
    }
  }

  // Send reply
  const handleSendReply = async () => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: email.id,
          draft: replyDraft,
          buildingId: email.building_id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      const data = await response.json()
      if (data.status === 'sent') {
        setShowReplyDraft(false)
        setReplyDraft('')
        onMarkHandled() // Mark as handled after sending
      }
    } catch (err) {
      console.error('Error sending email:', err)
      setError('Failed to send email. Please try again.')
    }
  }

  return (
    <div className="border-t bg-gray-50 p-4">
      {/* AI Action Buttons */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={handleGenerateReply}
          disabled={isGeneratingReply}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isGeneratingReply ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          ✍️ AI Draft Reply
        </Button>

        <Button
                      onClick={handleSummarise}
          disabled={isSummarizing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isSummarizing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          🧠 Summarise
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled
        >
          <Tag className="h-4 w-4" />
          📌 Tag (Coming Soon)
        </Button>

        <Button
          onClick={handleCreateEvent}
          disabled={isCreatingEvent}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isCreatingEvent ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4" />
          )}
          📆 Add to Calendar
        </Button>

        <Button
          onClick={handleCreateTodo}
          disabled={isCreatingTodo}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isCreatingTodo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckSquare className="h-4 w-4" />
          )}
          📝 Create To-Do
        </Button>

        <Button
          onClick={onMarkHandled}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 ml-auto"
        >
          <Check className="h-4 w-4" />
          ✅ Mark as Handled
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Reply Draft */}
      {showReplyDraft && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">AI Draft Reply</CardTitle>
              <Button
                onClick={() => setShowReplyDraft(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="AI-generated reply..."
              className="min-h-[120px]"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSendReply}
                size="sm"
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send Reply
              </Button>
              <Button
                onClick={() => setReplyDraft('')}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Email Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {summary}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 