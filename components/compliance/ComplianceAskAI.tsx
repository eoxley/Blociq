'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  Send,
  Brain,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Building,
  Lightbulb,
  Sparkles,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface ComplianceAskAIProps {
  buildingId?: string
  buildingName?: string
  className?: string
}

interface AIResponse {
  answer: string
  confidence: number
  sources: string[]
  suggestions: string[]
  context: {
    buildingId?: string
    documentsAnalyzed: number
    assetsAnalyzed: number
    timestamp: string
  }
}

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  response?: AIResponse
}

const ComplianceAskAI: React.FC<ComplianceAskAIProps> = ({
  buildingId,
  buildingName,
  className = ''
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'ai',
        content: buildingId 
          ? `Hi! I'm your compliance AI assistant for ${buildingName || 'this building'}. Ask me anything about compliance status, due dates, documents, or requirements!`
          : "Hi! I'm your compliance AI assistant. I can help with questions about your portfolio compliance status, regulations, upcoming deadlines, and more.",
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [buildingId, buildingName])

  // Auto-scroll removed - let users control their own scrolling
  // useEffect(() => {
  //   scrollToBottom()
  // }, [messages])

  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  // }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/compliance/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          buildingId,
          context: `Building: ${buildingName || 'Portfolio overview'}`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const aiResponse: AIResponse = await response.json()

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse.answer,
        timestamp: new Date(),
        response: aiResponse
      }

      setMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('AI query error:', error)
      toast.error('Failed to get AI response. Please try again.')
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm sorry, I couldn't process your question right now. Please try again in a moment.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 bg-green-50'
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-orange-600 bg-orange-50'
  }

  const suggestedQuestions = [
    'What compliance items are overdue?',
    'When is my next gas safety check due?',
    'Show me electrical inspection status',
    'What certificates need renewing soon?',
    'How much should I budget for compliance?',
    'What fire safety checks do I need?'
  ]

  if (!isExpanded) {
    return (
      <div className={`bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100 ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center gap-4 text-left hover:bg-white/50 rounded-lg p-4 transition-colors"
        >
          <div className="flex-shrink-0 p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Ask AI Compliance Assistant
            </h3>
            <p className="text-sm text-gray-600">
              Get instant answers about compliance status, requirements, and deadlines
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-purple-500" />
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Compliance Assistant</h3>
            <p className="text-xs text-gray-600">
              {buildingName ? `Focused on ${buildingName}` : 'Portfolio-wide assistance'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
        >
          <MessageSquare className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.type === 'user' 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-purple-100 text-purple-600'
            }`}>
              {message.type === 'user' ? (
                <Building className="h-4 w-4" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
            </div>

            {/* Message Content */}
            <div className={`flex-1 max-w-[80%] ${message.type === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}>
                <p className="text-sm">{message.content}</p>
              </div>

              {/* AI Response Details */}
              {message.type === 'ai' && message.response && (
                <div className="mt-2 space-y-2">
                  {/* Confidence Score */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getConfidenceColor(message.response.confidence)
                    }`}>
                      Confidence: {message.response.confidence}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {message.response.context.assetsAnalyzed} assets, {message.response.context.documentsAnalyzed} docs analyzed
                    </span>
                  </div>

                  {/* Sources */}
                  {message.response.sources.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <div className="flex items-center gap-1 mb-1">
                        <FileText className="h-3 w-3" />
                        <span className="font-medium">Sources:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 ml-4">
                        {message.response.sources.map((source, idx) => (
                          <li key={idx}>{source}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {message.response.suggestions.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <div className="flex items-center gap-1 mb-1">
                        <Lightbulb className="h-3 w-3" />
                        <span className="font-medium">Suggestions:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 ml-4">
                        {message.response.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Message */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              <Brain className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="inline-block p-3 bg-gray-100 rounded-lg rounded-bl-none">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Analyzing your compliance data...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 3).map((question, idx) => (
              <button
                key={idx}
                onClick={() => setInputValue(question)}
                className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-xs transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about compliance status, requirements, deadlines..."
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="flex-shrink-0 p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ComplianceAskAI