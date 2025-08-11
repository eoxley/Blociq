"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Paperclip, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
const AskBlocIQModal = dynamic(() => import('./AskBlocIQModal'), { ssr: false });

type ChatMessage = {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export default function FloatingBlocIQ() {
  const [isOpen, setIsOpen] = useState(false)
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
      content: inputValue,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setError(null)
    setIsLoading(true)

    try {
      // Simulate AI response (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `I understand you're asking about: "${inputValue}". Based on the context, I can help you with that. This is a simulated response - in production, this would call the actual BlocIQ AI API.`,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      setError('Failed to get response. Please try again.')
      console.error('AI response error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatMessageTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

      {/* Chat Modal */}
      <AskBlocIQModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <div className="flex flex-col h-full">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.isUser 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="text-sm whitespace-pre-line leading-relaxed">{message.content}</div>
                  <div className={`text-xs mt-2 ${
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
                <div className="bg-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex justify-start">
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            {/* Attachments Display */}
            {attachments.length > 0 && (
              <div className="mb-3 p-3 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-600 mb-2">📎 Attachments:</div>
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-gray-200">
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
                placeholder="Ask about anything..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
                className="bg-teal-600 text-white px-4 py-3 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
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
        </div>
      </AskBlocIQModal>
    </div>
  )
} 