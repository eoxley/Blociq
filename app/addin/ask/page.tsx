'use client'

import React, { useState, useEffect } from 'react'
import { Send, Sparkles, Mail, AlertCircle, Loader2 } from 'lucide-react'

interface MessageType {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AskBlocIQAddin() {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<MessageType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [emailContext, setEmailContext] = useState<string | null>(null)
  const [isOfficeReady, setIsOfficeReady] = useState(false)

  // Initialize Office add-in
  useEffect(() => {
    const initializeOffice = () => {
      if (typeof Office !== 'undefined') {
        Office.onReady(() => {
          setIsOfficeReady(true)
          loadEmailContext()
        })
      } else {
        // Fallback for development/testing
        setIsOfficeReady(true)
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeOffice)
    } else {
      initializeOffice()
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', initializeOffice)
    }
  }, [])

  // Load current email context
  const loadEmailContext = async () => {
    try {
      if (typeof Office !== 'undefined' && Office.context?.mailbox?.item) {
        Office.context.mailbox.item.body.getAsync('text', (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            setEmailContext(result.value)
          } else {
            console.warn('Could not load email context:', result.error)
            setEmailContext(null)
          }
        })
      } else {
        // Fallback for development
        setEmailContext('Email context not available in development mode')
      }
    } catch (error) {
      console.error('Error loading email context:', error)
      setEmailContext(null)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prompt.trim() || isLoading) return

    const userMessage: MessageType = {
      role: 'user',
      content: prompt,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setPrompt('')

    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          context: emailContext || 'No email context available'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: MessageType = {
        role: 'assistant',
        content: data.response || data.message || 'No response received',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error calling Ask AI:', error)

      const errorMessage: MessageType = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Ask BlocIQ</h1>
            <p className="text-sm text-teal-100">AI Property Management Assistant</p>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isOfficeReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-gray-600">
            {isOfficeReady ? 'Connected to Outlook' : 'Initializing...'}
          </span>
          {emailContext && (
            <>
              <span className="text-gray-400">•</span>
              <Mail className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">Email context loaded</span>
            </>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Ask BlocIQ</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Ask me anything about property management, compliance, or get help with your current email.
            </p>
            {!emailContext && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl max-w-md mx-auto">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">No email context available</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-xl shadow-sm ${
                    message.role === 'user'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-teal-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 border border-gray-200 p-3 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                    <span className="text-sm text-gray-600">BlocIQ is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask BlocIQ about property management, compliance, or this email..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isLoading ? 'Sending...' : 'Ask'}
          </button>
        </form>

        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Powered by BlocIQ AI • Property Management Assistant
          </p>
        </div>
      </div>
    </div>
  )
}