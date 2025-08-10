'use client'

import React, { useState } from 'react'
import { Brain, Wrench, Calendar, Mail, AlertTriangle, Plus, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface AIFollowUpPromptsProps {
  aiResponse: string
  buildingId?: string
  buildingName?: string
  onActionTriggered: (action: string, content: string) => void
  className?: string
}

interface FollowUpAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  prompt: string
}

export default function AIFollowUpPrompts({ 
  aiResponse, 
  buildingId, 
  buildingName,
  onActionTriggered,
  className = '' 
}: AIFollowUpPromptsProps) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null)

  const followUpActions: FollowUpAction[] = [
    {
      id: 'works_order',
      title: 'Raise a Works Order',
      description: 'Create a maintenance task based on this response',
      icon: <Wrench className="h-4 w-4" />,
      color: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      prompt: `Based on this AI response: "${aiResponse}", generate a detailed works order. Include priority level, estimated duration, required materials, and specific instructions for the maintenance team.`
    },
    {
      id: 'building_event',
      title: 'Add a Building Event',
      description: 'Schedule an event or inspection',
      icon: <Calendar className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      prompt: `Based on this AI response: "${aiResponse}", create a building event or inspection schedule. Include event type, date, duration, and any special requirements.`
    },
    {
      id: 'notify_directors',
      title: 'Notify Directors',
      description: 'Send an update to building directors',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'bg-red-100 text-red-800 hover:bg-red-200',
      prompt: `Based on this AI response: "${aiResponse}", draft a professional notification to building directors. Include key points, urgency level, and recommended actions.`
    },
    {
      id: 'send_email',
      title: 'Send as Email',
      description: 'Compose an email to residents',
      icon: <Mail className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800 hover:bg-green-200',
      prompt: `Based on this AI response: "${aiResponse}", draft a resident communication email. Make it informative, friendly, and include all relevant details.`
    }
  ]

  const handleActionClick = async (action: FollowUpAction) => {
    setIsGenerating(action.id)
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: action.prompt,
          contextType: 'follow_up',
          buildingId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onActionTriggered(action.id, data.result)
        toast.success(`${action.title} content generated!`)
      } else {
        toast.error('Failed to generate content')
      }
    } catch (error) {
      console.error('Error generating follow-up content:', error)
      toast.error('Error generating content')
    } finally {
      setIsGenerating(null)
    }
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-blue-600" />
        <h4 className="font-medium text-gray-900">Would you like to...</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {followUpActions.map((action) => (
          <Button
            key={action.id}
            onClick={() => handleActionClick(action)}
            disabled={isGenerating === action.id}
            variant="outline"
            className={`h-auto p-3 flex flex-col items-start gap-2 ${action.color}`}
          >
            <div className="flex items-center gap-2 w-full">
              {isGenerating === action.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                action.icon
              )}
              <span className="font-medium">{action.title}</span>
            </div>
            <p className="text-xs opacity-80 text-left">
              {action.description}
            </p>
          </Button>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t">
        <p className="text-xs text-gray-500 text-center">
          AI will generate appropriate content based on the response
        </p>
      </div>
    </Card>
  )
} 