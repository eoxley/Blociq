'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2, Paperclip, Home } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type ChatMessage = {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export default function FloatingBlocIQ() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hello! I'm your BlocIQ assistant. I can help you with property management questions, compliance guidance, and more. What would you like to know?",
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() && attachments.length === 0) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue + (attachments.length > 0 ? `\n\n📎 Attachments: ${attachments.map(f => f.name).join(', ')}` : ''),
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setAttachments([])
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('message', inputValue)
      
      // Add attachments to form data
      attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file)
      })

      const res = await fetch('/api/ask-assistant', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Failed to get AI answer')
      }

      const data = await res.json()

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.answer || data.content || 'No answer received',
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      console.error('Error in handleSubmit:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const formatMessageTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-96 h-[500px] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">BlocIQ Assistant</h3>
                <p className="text-xs text-white/80">Your AI property companion</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white/80 hover:text-white transition-colors"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.isUser 
                        ? 'bg-teal-600 text-white' 
                        : 'bg-gray-50 text-gray-900 border border-gray-200'
                    }`}>
                      <div className="text-sm whitespace-pre-line">{message.content}</div>
                      <div className={`text-xs mt-1 ${
                        message.isUser ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
                {/* Attachments Display */}
                {attachments.length > 0 && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-2">📎 Attachments:</div>
                    <div className="space-y-1">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                          <span className="truncate flex-1">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
                    disabled={isLoading}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about your buildings, compliance, or recent emails…"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sm"
                    disabled={isLoading}
                  />
                  <button 
                    type="submit"
                    disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
                    className="bg-teal-600 text-white px-4 py-3 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Home className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileAttachment}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                />
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
} 