'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, X, Mail } from 'lucide-react'
import { toast } from 'sonner'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type AIResponse = {
  success: boolean
  response?: string
  result?: string
}

interface AskBlocIQModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AskBlocIQModal({ isOpen, onClose }: AskBlocIQModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messageIdCounter, setMessageIdCounter] = useState(1)
  const [email, setEmail] = useState('')
  const [hasSubmittedEmail, setHasSubmittedEmail] = useState(false)
  const [showEmailCapture, setShowEmailCapture] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Show email capture after first AI response
  useEffect(() => {
    if (messages.length >= 2 && !hasSubmittedEmail && !showEmailCapture) {
      setShowEmailCapture(true)
    }
  }, [messages, hasSubmittedEmail, showEmailCapture])

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      const newHeight = Math.min(inputRef.current.scrollHeight, 120)
      inputRef.current.style.height = `${newHeight}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [prompt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    // Require email before allowing chat
    if (!hasSubmittedEmail) {
      toast.error('Please enter your email address first')
      return
    }

    const userMessageId = `msg-${messageIdCounter}`
    setMessageIdCounter(prev => prev + 1)
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setPrompt('')
    setIsLoading(true)

    try {
      const requestBody = JSON.stringify({
        prompt: userMessage.content,
        building_id: null,
        is_public: true,
        email: email || undefined
      })

      const response = await fetch('/api/ask-ai-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      })

      const data: AIResponse = await response.json()

      if (data.success) {
        const assistantMessageId = `msg-${messageIdCounter}`
        setMessageIdCounter(prev => prev + 1)
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: data.result || data.response || '',
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])
      } else if (response.status === 401) {
        const assistantMessageId = `msg-${messageIdCounter}`
        setMessageIdCounter(prev => prev + 1)
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: "I'd be happy to help! Please log in to use the full AI features, or try asking a general question about property management.",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        toast.error('Failed to get AI response')
      }
    } catch (error) {
      console.error('Error asking AI:', error)

      const assistantMessageId = `msg-${messageIdCounter}`
      setMessageIdCounter(prev => prev + 1)
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      // Store email for future requests
      setHasSubmittedEmail(true)
      setShowEmailCapture(false)
      toast.success('Thanks! Continue exploring AskBlocIQ.')

      // Optional: Send email to backend for tracking
      await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'ask_blociq_modal' })
      }).catch(() => {}) // Silently fail if endpoint doesn't exist yet
    } catch (error) {
      console.error('Email capture error:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(e as any)
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (prompt.trim()) {
        handleSubmit(e as any)
      }
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              Ask BlocIQ – Your AI Property Assistant
            </h2>
            <p className="text-sm text-gray-600 mt-1">Professional UK Property Management AI</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Email Capture Banner */}
        {showEmailCapture && !hasSubmittedEmail && (
          <div className="bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] p-4">
            <form onSubmit={handleEmailSubmit} className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-white flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-white font-medium mb-2">Like what you see?</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email to learn more"
                    className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white text-[#6A00F5] rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    Get Updates
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailCapture(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </form>
          </div>
        )}

        {/* Chat Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]"
        >
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <p className="text-xs text-gray-500 mb-4">Scroll for more info ↕️</p>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Welcome to Ask BlocIQ</h3>
              <p className="text-gray-600 mb-6">Your professional AI property management assistant</p>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-left max-w-lg mx-auto">
                <p className="text-sm text-gray-700 mb-4">
                  You are welcome to try our Ask BlocIQ AI. This is BlocIQ's own secure, ring-fenced AI service — designed specifically for UK leasehold property management.
                </p>
                <p className="text-sm text-gray-700">
                  <strong>All information you input and receive is GDPR-safe, confidential, and never shared with third parties.</strong> Your chats stay private, and the service runs on a secure UK-based server.
                </p>
              </div>

              {!hasSubmittedEmail && (
                <div className="bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-xl p-6 mb-6 max-w-lg mx-auto">
                  <p className="text-white font-semibold mb-3">Enter your email address to start chatting</p>
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-gray-900"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full px-6 py-3 bg-white text-[#6A00F5] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Start Using Ask BlocIQ
                    </button>
                  </form>
                </div>
              )}

              {hasSubmittedEmail && (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4">Ask me anything about property management!</p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                    <button
                      onClick={() => setPrompt("What is the Building Safety Act?")}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      What is the Building Safety Act?
                    </button>
                    <button
                      onClick={() => setPrompt("How do I manage Section 20 consultations?")}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      Section 20 consultations
                    </button>
                    <button
                      onClick={() => setPrompt("Tell me about lease management")}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      Tell me about lease management
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%]`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                  }`}>
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading Message */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#6A00F5]" />
                    <span className="text-sm text-gray-600">BlocIQ is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask anything about property management..."
                className="w-full pl-4 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all duration-200 resize-none text-gray-900 placeholder-gray-500"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '48px' }}
              />

              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] hover:brightness-110 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Press Cmd+Enter to send • Shift+Enter for new line
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}