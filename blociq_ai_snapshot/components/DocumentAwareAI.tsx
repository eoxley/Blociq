'use client'

import React, { useState } from 'react'
import { Brain, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface DocumentAwareAIProps {
  documentId: string
  documentName: string
  documentType: string
  buildingId?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'button' | 'icon' | 'inline'
}

interface AIResponse {
  success: boolean
  result: string
  ai_log_id: string
  context_type: string
  building_id?: string
}

export default function DocumentAwareAI({
  documentId,
  documentName,
  documentType,
  buildingId,
  className = '',
  size = 'sm',
  variant = 'button'
}: DocumentAwareAIProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [analysis, setAnalysis] = useState<string>('')

  const getAnalysisPrompt = () => {
    const prompts = [
      `Analyze this ${documentType} document: ${documentName}. What are the key points, requirements, and any important dates or deadlines?`,
      `Summarize the main findings and recommendations in ${documentName}.`,
      `What are the critical compliance requirements mentioned in ${documentName}?`,
      `Extract key dates, deadlines, and action items from ${documentName}.`,
      `What are the most important points that property managers should know about ${documentName}?`
    ]
    return prompts[Math.floor(Math.random() * prompts.length)]
  }

  const handleAnalyze = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: getAnalysisPrompt(),
          contextType: 'document',
          buildingId,
          document_ids: [documentId],
        }),
      })

      const data: AIResponse = await response.json()

      if (data.success) {
        setAnalysis(data.result)
        setShowAnalysis(true)
        toast.success('Document analysis complete!')
      } else {
        toast.error('Failed to analyze document')
      }
    } catch (error) {
      console.error('Error analyzing document:', error)
      toast.error('Error analyzing document')
    } finally {
      setIsLoading(false)
    }
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

  const getButtonClasses = () => {
    switch (variant) {
      case 'icon':
        return 'p-1 hover:bg-blue-50 hover:text-blue-600 transition-colors'
      case 'inline':
        return 'inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline text-sm'
      default:
        return 'flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-colors'
    }
  }

  const renderButton = () => {
    if (variant === 'inline') {
      return (
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className={getButtonClasses()}
          title={`Ask BlocIQ about ${documentName}`}
        >
          {isLoading ? (
            <Loader2 className={getButtonSize()} animate-spin />
          ) : (
            <Brain className={getButtonSize()} />
          )}
          Ask about this file
        </button>
      )
    }

    if (variant === 'icon') {
      return (
        <Button
          onClick={handleAnalyze}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className={getButtonClasses()}
          title={`Ask BlocIQ about ${documentName}`}
        >
          {isLoading ? (
            <Loader2 className={getButtonSize()} animate-spin />
          ) : (
            <Brain className={getButtonSize()} />
          )}
        </Button>
      )
    }

    return (
      <Button
        onClick={handleAnalyze}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 ${getButtonClasses()} ${className}`}
        title={`Ask BlocIQ about ${documentName}`}
      >
        {isLoading ? (
          <Loader2 className={getButtonSize()} animate-spin />
        ) : (
          <Brain className={getButtonSize()} />
        )}
        <span>Ask about this file</span>
      </Button>
    )
  }

  return (
    <>
      {renderButton()}

      {/* Analysis Modal */}
      {showAnalysis && analysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Document Analysis</h3>
                <Badge variant="outline" className="ml-2">
                  {documentType}
                </Badge>
              </div>
              <Button
                onClick={() => setShowAnalysis(false)}
                variant="ghost"
                size="sm"
                className="p-1"
              >
                ×
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Analyzing:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {documentName}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Analysis:</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {analysis}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-xs text-gray-500">
                Powered by BlocIQ AI
              </div>
              <Button
                onClick={() => setShowAnalysis(false)}
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