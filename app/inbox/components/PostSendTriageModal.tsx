'use client'

import React, { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  FileText, 
  Calendar, 
  X, 
  Loader2,
  Brain,
  Clock,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface PostSendTriageModalProps {
  isOpen: boolean
  onClose: () => void
  emailId: string
  originalEmail: {
    id: string
    subject: string | null
    from_name: string | null
    from_email: string | null
    body_full: string | null
    tags: string[] | null
    building_id: string | null
  }
  onActionComplete: () => void
}

type TriageAction = 'mark_handled' | 'log_this' | 'follow_up' | 'no_action'

interface AISuggestion {
  action: TriageAction
  confidence: number
  reasoning: string
}

export default function PostSendTriageModal({
  isOpen,
  onClose,
  emailId,
  originalEmail,
  onActionComplete
}: PostSendTriageModalProps) {
  const [selectedAction, setSelectedAction] = useState<TriageAction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Get AI suggestion when modal opens
  useEffect(() => {
    if (isOpen && !aiSuggestion) {
      getAISuggestion()
    }
  }, [isOpen])

  const getAISuggestion = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Analyze this email conversation and suggest the best post-reply action:
          
Original Email:
Subject: ${originalEmail.subject}
From: ${originalEmail.from_name || originalEmail.from_email}
Content: ${originalEmail.body_full}

Available actions:
- mark_handled: Email is fully resolved
- log_this: Create a task or log entry for follow-up
- follow_up: Schedule a follow-up email or call
- no_action: No further action needed

Return JSON with action, confidence (0-100), and reasoning.`,
          building_id: originalEmail.building_id || 'general'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Parse the AI response to extract suggestion
        const suggestion = parseAISuggestion(data.summary)
        setAiSuggestion(suggestion)
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const parseAISuggestion = (summary: string): AISuggestion => {
    // Simple parsing logic - in a real implementation, you'd want more sophisticated parsing
    const lowerSummary = summary.toLowerCase()
    
    if (lowerSummary.includes('mark as handled') || lowerSummary.includes('resolved')) {
      return {
        action: 'mark_handled',
        confidence: 85,
        reasoning: 'Email appears to be resolved based on content analysis'
      }
    } else if (lowerSummary.includes('follow up') || lowerSummary.includes('schedule')) {
      return {
        action: 'follow_up',
        confidence: 80,
        reasoning: 'Content suggests follow-up action may be needed'
      }
    } else if (lowerSummary.includes('log') || lowerSummary.includes('task')) {
      return {
        action: 'log_this',
        confidence: 75,
        reasoning: 'Content suggests creating a log entry or task'
      }
    } else {
      return {
        action: 'no_action',
        confidence: 70,
        reasoning: 'No specific action required based on content'
      }
    }
  }

  const handleAction = async (action: TriageAction) => {
    setIsLoading(true)
    setSelectedAction(action)

    try {
      switch (action) {
        case 'mark_handled':
          await markAsHandled()
          break
        case 'log_this':
          await createLogEntry()
          break
        case 'follow_up':
          await scheduleFollowUp()
          break
        case 'no_action':
          // No action needed
          break
      }

      toast.success('Action completed successfully')
      onActionComplete()
      onClose()
    } catch (error) {
      console.error('Error performing action:', error)
      toast.error('Failed to complete action')
    } finally {
      setIsLoading(false)
      setSelectedAction(null)
    }
  }

  const markAsHandled = async () => {
    const response = await fetch('/api/mark-handled', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailId: emailId,
        handledBy: 'email_reply',
        handledAt: new Date().toISOString()
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to mark as handled')
    }
  }

  const createLogEntry = async () => {
    const response = await fetch('/api/create-task-from-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailId: emailId,
        title: `Follow-up: ${originalEmail.subject}`,
        description: `Email from ${originalEmail.from_name || originalEmail.from_email} requires follow-up action`,
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        buildingId: originalEmail.building_id
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create log entry')
    }
  }

  const scheduleFollowUp = async () => {
    // Create a task for follow-up
    await createLogEntry()
    
    // You could also integrate with calendar here
    toast.info('Follow-up task created. Consider scheduling a calendar reminder.')
  }

  if (!isOpen) return null

  const actions = [
    {
      id: 'mark_handled' as TriageAction,
      label: 'Mark as Handled',
      description: 'Email is fully resolved',
      icon: CheckCircle,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'log_this' as TriageAction,
      label: 'Log This',
      description: 'Create a task or log entry',
      icon: FileText,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'follow_up' as TriageAction,
      label: 'Schedule Follow-up',
      description: 'Set a reminder for later',
      icon: Calendar,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      id: 'no_action' as TriageAction,
      label: 'No Action',
      description: 'No further action needed',
      icon: X,
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Post-Reply Triage
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            What would you like to do with this email conversation?
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">AI Suggestion</span>
                <Badge variant="outline" className="text-xs">
                  {aiSuggestion.confidence}% confidence
                </Badge>
              </div>
              <p className="text-sm text-blue-800 mb-3">
                {aiSuggestion.reasoning}
              </p>
              <Button
                onClick={() => handleAction(aiSuggestion.action)}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                {isLoading && selectedAction === aiSuggestion.action ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Use AI Suggestion
              </Button>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm text-gray-600">Analyzing conversation...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actions.map((action) => {
              const Icon = action.icon
              const isSelected = selectedAction === action.id
              const isAISuggested = aiSuggestion?.action === action.id
              
              return (
                <Button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  disabled={isLoading}
                  variant="outline"
                  className={`h-auto p-4 flex flex-col items-start gap-2 text-left ${
                    isAISuggested ? 'border-blue-300 bg-blue-50' : ''
                  } ${isSelected ? 'border-2 border-blue-500' : ''}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{action.label}</span>
                                         {isAISuggested && (
                       <Badge variant="outline" className="ml-auto text-xs">
                         AI
                       </Badge>
                     )}
                  </div>
                  <span className="text-sm text-gray-600">{action.description}</span>
                  {isLoading && isSelected && (
                    <Loader2 className="h-4 w-4 animate-spin absolute top-2 right-2" />
                  )}
                </Button>
              )
            })}
          </div>

          {/* Email Context */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">
              <strong>Subject:</strong> {originalEmail.subject || 'No Subject'}
            </div>
            <div className="text-sm text-gray-600">
              <strong>From:</strong> {originalEmail.from_name || originalEmail.from_email}
            </div>
            {originalEmail.tags && originalEmail.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {originalEmail.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 