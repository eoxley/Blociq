'use client'

import React, { useState } from 'react'
import { Brain, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface AIButtonProps {
  contextType: 'document' | 'compliance' | 'todo'
  itemId: string
  itemTitle: string
  buildingId?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

interface AIResponse {
  success: boolean
  result: string
  ai_log_id: string
  context_type: string
  building_id?: string
}

export default function AIButton({ 
  contextType, 
  itemId, 
  itemTitle, 
  buildingId,
  className = '',
  size = 'sm'
}: AIButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const [response, setResponse] = useState<AIResponse | null>(null)

  const getPrompt = () => {
    switch (contextType) {
      case 'document':
        return `Explain this document: ${itemTitle}. What are the key points, requirements, and any important dates or deadlines?`
      case 'compliance':
        return `What is the issue with this compliance task: ${itemTitle}? What needs to be done to resolve it?`
      case 'todo':
        return `Analyze this todo task: ${itemTitle}. What are the priorities, dependencies, and recommended next steps?`
      default:
        return `Please explain: ${itemTitle}`
    }
  }

  const handleAIClick = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: getPrompt(),
          contextType,
          buildingId,
          documentIds: contextType === 'document' ? [itemId] : [],
          complianceItemId: contextType === 'compliance' ? itemId : undefined,
          todoId: contextType === 'todo' ? itemId : undefined,
        }),
      })

      const data: AIResponse = await response.json()

      if (data.success) {
        setResponse(data)
        setShowResponse(true)
        toast.success('AI analysis complete!')
      } else {
        toast.error('Failed to get AI response')
      }
    } catch (error) {
      console.error('Error calling AI:', error)
      toast.error('Error getting AI response')
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonSize = () => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6'
      case 'md':
        return 'h-8 w-8'
      case 'lg':
        return 'h-10 w-10'
      default:
        return 'h-6 w-6'
    }
  }

  return (
    <>
      <Button
        onClick={handleAIClick}
        disabled={isLoading}
        variant="ghost"
        size="sm"
        className={`p-1 hover:bg-blue-50 hover:text-blue-600 transition-colors ${className}`}
        title={`Ask BlocIQ about this ${contextType}`}
      >
        {isLoading ? (
          <Loader2 className={`${getButtonSize()} animate-spin text-blue-600`} />
        ) : (
          <Brain className={`${getButtonSize()} text-gray-500 hover:text-blue-600`} />
        )}
      </Button>

      {/* AI Response Modal */}
      {showResponse && response && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">BlocIQ AI Analysis</h3>
                <Badge variant="outline" className="ml-2">
                  {contextType}
                </Badge>
              </div>
              <Button
                onClick={() => setShowResponse(false)}
                variant="ghost"
                size="sm"
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Analyzing:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {itemTitle}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">AI Response:</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {response.result}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                <p>AI Log ID: {response.ai_log_id}</p>
                {response.building_id && <p>Building ID: {response.building_id}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-xs text-gray-500">
                Powered by BlocIQ AI
              </div>
              <Button
                onClick={() => setShowResponse(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
} 