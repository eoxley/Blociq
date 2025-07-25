'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, MessageCircle } from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { toast } from 'sonner'

type AIResponse = {
  success: boolean
  response: string
  documentSearch?: boolean
  documents?: any[]
}

type DocumentSearchResult = {
  id: string
  title: string
  document_url: string
  extracted_date: string
  summary: string
}

export default function AskBlocIQHomepage() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [documentResults, setDocumentResults] = useState<DocumentSearchResult[]>([])
  const [isDocumentSearch, setIsDocumentSearch] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Rotating placeholder suggestions
  const placeholderSuggestions = [
    "When is the next fire risk assessment due at Ashwood House?",
    "Find the gas safety cert for Kings Court",
    "Summarise the latest leak report",
    "Send an insurance reminder to all directors",
    "What's the status of the lift maintenance?",
    "Show me all compliance documents for this month",
    "Create a meeting agenda for the AGM",
    "What's the current service charge balance?"
  ]

  const [currentPlaceholder, setCurrentPlaceholder] = useState(placeholderSuggestions[0])

  // Rotate placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(prev => {
        const currentIndex = placeholderSuggestions.indexOf(prev)
        const nextIndex = (currentIndex + 1) % placeholderSuggestions.length
        return placeholderSuggestions[nextIndex]
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Quick suggestion buttons
  const quickSuggestions = [
    "When is the next fire risk assessment due at Ashwood House?",
    "Find the gas safety cert for Kings Court",
    "Summarise the latest leak report",
    "Send an insurance reminder to all directors"
  ]

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    setIsLoading(true)
    setAiResponse(null)
    setDocumentResults([])
    setIsDocumentSearch(false)
    setShowSuggestions(false)

    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          building_id: null // Homepage doesn't have specific building context
        }),
      })

      const data: AIResponse = await response.json()

      if (data.success) {
        setAiResponse(data)
        
        if (data.documentSearch && data.documents) {
          setIsDocumentSearch(true)
          setDocumentResults(data.documents)
        }

        // Scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          })
        }, 100)
      } else {
        toast.error('Failed to get AI response')
      }
    } catch (error) {
      console.error('Error asking AI:', error)
      toast.error('Failed to connect to AI assistant')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Input Section */}
      <BlocIQCard variant="elevated">
        <BlocIQCardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#333333]">Ask BlocIQ AI</h2>
              <p className="text-sm text-[#64748B]">Get instant answers about your properties</p>
            </div>
          </div>
        </BlocIQCardHeader>
        
        <BlocIQCardContent>

          {/* Chat-style Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentPlaceholder}
                className="w-full px-4 py-4 pr-12 bg-white border-2 border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent transition-all duration-200 text-[#333333] placeholder-[#94A3B8]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Quick Suggestions */}
            {showSuggestions && (
              <div className="space-y-3">
                <p className="text-sm text-[#64748B] font-medium">Try asking:</p>
                <div className="grid grid-cols-1 gap-2">
                  {quickSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2 bg-white border border-[#E2E8F0] hover:border-[#008C8F] hover:bg-[#F0FDFA] rounded-lg text-sm text-[#333333] transition-all duration-200 hover:shadow-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </BlocIQCardContent>
      </BlocIQCard>

      {/* AI Response Section */}
      {isLoading && (
        <BlocIQCard variant="elevated" className="bg-gradient-to-br from-[#F0FDFA] to-emerald-50">
          <BlocIQCardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#008C8F]" />
                <span className="text-[#333333] font-medium">BlocIQ is thinking...</span>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      )}

      {/* Results Section */}
      {aiResponse && (
        <div ref={resultsRef} className="space-y-4">
          {/* AI Response */}
          <BlocIQCard variant="elevated" className="bg-gradient-to-br from-white to-[#FAFAFA] border-l-4 border-[#008C8F]">
            <BlocIQCardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-[#333333] leading-relaxed">
                      {aiResponse.response}
                    </div>
                  </div>
                </div>
              </div>
            </BlocIQCardContent>
          </BlocIQCard>

          {/* Document Search Results */}
          {isDocumentSearch && documentResults.length > 0 && (
            <BlocIQCard variant="elevated" className="bg-gradient-to-br from-[#F0FDFA] to-emerald-50">
              <BlocIQCardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#2BBEB4] to-[#008C8F] rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#333333]">Found Documents</h3>
                </div>
                <div className="space-y-3">
                  {documentResults.map((doc, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-[#E2E8F0] hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#333333] mb-1">{doc.title}</h4>
                          <p className="text-sm text-[#64748B] mb-2">{doc.summary}</p>
                          <div className="flex items-center gap-4 text-xs text-[#64748B]">
                            <span>📅 {new Date(doc.extracted_date).toLocaleDateString()}</span>
                            <a
                              href={doc.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#008C8F] hover:text-[#007B8A] font-medium"
                            >
                              📎 View Document
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
          )}

          {/* No Documents Found */}
          {isDocumentSearch && documentResults.length === 0 && (
            <BlocIQCard variant="elevated" className="bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-amber-400">
              <BlocIQCardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#333333] mb-1">No Documents Found</h3>
                    <p className="text-sm text-[#64748B]">
                      I couldn't find that document. Would you like to upload one now?
                    </p>
                    <BlocIQButton
                      size="sm"
                      className="mt-3 bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] text-white"
                    >
                      📤 Upload Document
                    </BlocIQButton>
                  </div>
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
          )}
        </div>
      )}
    </div>
  )
} 