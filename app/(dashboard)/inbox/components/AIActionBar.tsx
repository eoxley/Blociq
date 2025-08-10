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
  X,
  Sparkles,
  FileText,
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface AIActionBarProps {
  email: Email
  onMarkHandled: () => void
  onGenerateReply?: (emailId: string, subject: string | null, bodyPreview: string | null) => Promise<void>
  onSummarizeEmail?: (emailId: string, subject: string | null, bodyPreview: string | null) => Promise<void>
  onClassifyEmail?: (emailId: string, subject: string | null, bodyPreview: string | null) => Promise<void>
  isGeneratingReply?: boolean
  isSummarizing?: boolean
  isClassifying?: boolean
  replyResponse?: string
  summary?: string
  replyError?: string
}

export default function AIActionBar({ 
  email, 
  onMarkHandled,
  onGenerateReply,
  onSummarizeEmail,
  onClassifyEmail,
  isGeneratingReply = false,
  isSummarizing = false,
  isClassifying = false,
  replyResponse,
  summary,
  replyError
}: AIActionBarProps) {
  const [showReplyDraft, setShowReplyDraft] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate AI draft reply
  const handleGenerateReply = async () => {
    if (!onGenerateReply) return
    
    setError(null)
    try {
      await onGenerateReply(email.id, email.subject, email.body_full || email.body_preview)
      if (replyResponse) {
        setReplyDraft(replyResponse)
        setShowReplyDraft(true)
      }
    } catch (err) {
      console.error('Error generating reply:', err)
      setError('Failed to generate reply. Please try again.')
    }
  }

  // Summarise email
  const handleSummarise = async () => {
    if (!onSummarizeEmail) return
    
    setError(null)
    try {
      await onSummarizeEmail(email.id, email.subject, email.body_full || email.body_preview)
      setShowSummary(true)
    } catch (err) {
      console.error('Error summarizing email:', err)
      setError('Failed to summarize email. Please try again.')
    }
  }

  // Classify email
  const handleClassify = async () => {
    if (!onClassifyEmail) return
    
    setError(null)
    try {
      await onClassifyEmail(email.id, email.subject, email.body_full || email.body_preview)
    } catch (err) {
      console.error('Error classifying email:', err)
      setError('Failed to classify email. Please try again.')
    }
  }

  // Create calendar event
  const handleCreateEvent = async () => {
    try {
      const response = await fetch('/api/create-event', {
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
        throw new Error('Failed to create event')
      }

      const data = await response.json()
      toast.success('Calendar event created successfully')
    } catch (err) {
      console.error('Error creating event:', err)
      toast.error('Failed to create calendar event')
    }
  }

  // Create todo
  const handleCreateTodo = async () => {
    try {
      const response = await fetch('/api/create-task-from-suggestion', {
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
        throw new Error('Failed to create todo')
      }

      const data = await response.json()
      toast.success('Todo created successfully')
    } catch (err) {
      console.error('Error creating todo:', err)
      toast.error('Failed to create todo')
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
          toEmail: email.from_email,
          subject: email.subject,
          content: replyDraft
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      const data = await response.json()
      setShowReplyDraft(false)
      onMarkHandled()
      toast.success('Reply sent successfully')
    } catch (err) {
      console.error('Error sending reply:', err)
      toast.error('Failed to send reply')
    }
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Generate Reply */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Generate Reply</h3>
                <p className="text-xs text-gray-600">AI-powered response</p>
              </div>
            </div>
            <Button
              onClick={handleGenerateReply}
              disabled={isGeneratingReply}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg"
            >
              {isGeneratingReply ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isGeneratingReply ? 'Generating...' : 'Generate Reply'}
            </Button>
          </CardContent>
        </Card>

        {/* Summarize Email */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Summarize</h3>
                <p className="text-xs text-gray-600">Key points extract</p>
              </div>
            </div>
            <Button
              onClick={handleSummarise}
              disabled={isSummarizing}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg"
            >
              {isSummarizing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              {isSummarizing ? 'Summarizing...' : 'Summarize'}
            </Button>
          </CardContent>
        </Card>

        {/* Classify Email */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Classify</h3>
                <p className="text-xs text-gray-600">Auto-categorize</p>
              </div>
            </div>
            <Button
              onClick={handleClassify}
              disabled={isClassifying}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg"
            >
              {isClassifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {isClassifying ? 'Classifying...' : 'Classify'}
            </Button>
          </CardContent>
        </Card>

        {/* Create Event */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Create Event</h3>
                <p className="text-xs text-gray-600">Add to calendar</p>
              </div>
            </div>
            <Button
              onClick={handleCreateEvent}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-lg"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reply Draft Modal */}
      {showReplyDraft && (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                AI Generated Reply
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyDraft(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="Edit the AI-generated reply..."
              className="min-h-[200px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleSendReply}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Reply
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReplyDraft(false)}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Modal */}
      {showSummary && summary && (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Email Summary
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSummary(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Key Points</span>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {summary}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleCreateTodo}
          variant="outline"
          className="border-gray-300 hover:bg-gray-50"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Create Todo
        </Button>
        
        <Button
          onClick={onMarkHandled}
          variant="outline"
          className="border-green-300 text-green-600 hover:bg-green-50"
        >
          <Check className="h-4 w-4 mr-2" />
          Mark Handled
        </Button>
      </div>
    </div>
  )
} 