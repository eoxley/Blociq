'use client'

import React, { useState } from 'react'
import { Brain, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface AIDraftButtonProps {
  buildingId?: string
  buildingName?: string
  contextType?: 'service_charge' | 'letter' | 'update' | 'general'
  onDraftGenerated: (draft: string) => void
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

export default function AIDraftButton({ 
  buildingId,
  buildingName,
  contextType = 'general',
  onDraftGenerated,
  className = '',
  size = 'sm'
}: AIDraftButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [draft, setDraft] = useState<string>('')

  const getDraftPrompt = () => {
    const buildingContext = buildingName ? ` for ${buildingName}` : ''
    
    switch (contextType) {
      case 'service_charge':
        return `Draft a clear and professional service charge explanation${buildingContext}. Include key points about what the service charge covers, how it's calculated, and when it's due. Use a helpful but authoritative tone.`
      case 'letter':
        return `Draft a professional letter to directors${buildingContext}. The letter should be formal, clear, and address any concerns or updates professionally.`
      case 'update':
        return `Draft an update for residents${buildingContext}. This should be informative, friendly, and include relevant details about building maintenance, events, or important notices.`
      default:
        return `Draft a professional communication${buildingContext}. Make it clear, helpful, and appropriate for property management context.`
    }
  }

  const handleGenerateDraft = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: getDraftPrompt(),
          contextType: 'draft',
          buildingId,
        }),
      })

      const data: AIResponse = await response.json()

      if (data.success) {
        setDraft(data.result)
        setShowDraftModal(true)
        toast.success('Draft generated successfully!')
      } else {
        toast.error('Failed to generate draft')
      }
    } catch (error) {
      console.error('Error generating draft:', error)
      toast.error('Error generating draft')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseDraft = () => {
    onDraftGenerated(draft)
    setShowDraftModal(false)
    toast.success('Draft applied to your message!')
  }

  const getButtonSize = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4'
      case 'md':
        return 'h-5 w-5'
      case 'lg':
        return 'h-6 w-6'
      default:
        return 'h-4 w-4'
    }
  }

  return (
    <>
      <Button
        onClick={handleGenerateDraft}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-colors ${className}`}
        title="Generate AI draft"
      >
        {isLoading ? (
          <Loader2 className={`${getButtonSize()} animate-spin text-blue-600`} />
        ) : (
          <>
            <Sparkles className={`${getButtonSize()} text-blue-600`} />
            <span className="text-sm">Draft with BlocIQ AI</span>
          </>
        )}
      </Button>

      {/* Draft Modal */}
      {showDraftModal && draft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">AI Generated Draft</h3>
                <Badge variant="outline" className="ml-2">
                  {contextType.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Generated Draft:</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {draft}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-xs text-gray-500">
                Review and edit the draft before using
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowDraftModal(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUseDraft}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  Use This Draft
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
} 