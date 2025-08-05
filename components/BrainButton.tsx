'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Brain, X, Send, Loader2, Paperclip, MessageCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type ChatMessage = {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

type ChatSize = 'small' | 'medium' | 'large'

export default function BrainButton() {
  const pathname = usePathname()
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
  const [chatSize, setChatSize] = useState<ChatSize>('small')
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  // Don't show on home page, login, auth pages
  if (pathname === '/' || pathname === '/home' || pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return null
  }

  // Extract context from pathname
  const extractContext = () => {
    const buildingMatch = pathname.match(/\/buildings\/([^\/]+)/)
    const majorWorksMatch = pathname.match(/\/major-works\/([^\/]+)/)
    const complianceMatch = pathname.match(/\/compliance\/([^\/]+)/)
    
    if (buildingMatch) {
      return { type: 'building', id: buildingMatch[1] }
    } else if (majorWorksMatch) {
      return { type: 'major-works', id: majorWorksMatch[1] }
    } else if (complianceMatch) {
      return { type: 'compliance', id: complianceMatch[1] }
    }
    return null
  }

  // Size configurations
  const sizeConfig = {
    small: { width: 'w-80', height: 'h-[400px]' },
    medium: { width: 'w-96', height: 'h-[500px]' },
    large: { width: 'w-[500px]', height: 'h-[600px]' }
  }

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

    const context = extractContext()
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
      
      // Add context information
      if (context) {
        formData.append('context_type', context.type)
        formData.append('context_id', context.id)
      }
      
      // Add attachments to form data
      attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file)
      })

      const res = await fetch('/api/ask-ai', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Failed to get AI answer')
      }

      const data = await res.json()

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response || data.content || 'No answer received',
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      // Log usage event
      try {
        await supabase.from('ai_logs').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          prompt: inputValue,
          response: data.response,
          context_type: context?.type || 'general',
          context_id: context?.id || null,
          page_url: pathname,
          metadata: {
            brain_button_usage: true,
            attachments_count: attachments.length
          }
        })
      } catch (logError) {
        console.error('Failed to log brain button usage:', logError)
      }
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

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  // Cycle through sizes
  const cycleSize = () => {
    const sizes: ChatSize[] = ['small', 'medium', 'large']
    const currentIndex = sizes.indexOf(chatSize)
    const nextIndex = (currentIndex + 1) % sizes.length
    setChatSize(sizes[nextIndex])
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Brain Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 animate-pulse"
          aria-label="Open Ask BlocIQ"
          title="Ask BlocIQ — get help on anything on this page"
        >
          <Brain className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          ref={chatRef}
          className={`bg-white rounded-3xl shadow-2xl border border-gray-200 ${sizeConfig[chatSize].width} ${sizeConfig[chatSize].height} flex flex-col backdrop-blur-sm bg-white/95`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'default'
          }}
        >
          {/* Header */}
          <div 
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-3xl flex items-center justify-between cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Ask BlocIQ</h3>
                <p className="text-xs text-white/80">Your AI property companion</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cycleSize}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                title="Resize chat"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                {isMinimized ? <MessageCircle className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/50 backdrop-blur-sm">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm backdrop-blur-sm ${
                      message.isUser 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white/80 text-gray-900 border border-gray-200/50'
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
                    <div className="bg-white/80 border border-gray-200/50 rounded-2xl px-4 py-3 shadow-sm backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm rounded-b-3xl">
                {/* Attachments Display */}
                {attachments.length > 0 && (
                  <div className="mb-3 p-3 bg-white/60 rounded-xl backdrop-blur-sm">
                    <div className="text-xs text-gray-600 mb-2">📎 Attachments:</div>
                    <div className="space-y-1">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-gray-200/50">
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
                    className="px-3 py-3 border border-gray-300/50 rounded-xl hover:bg-white/60 transition-colors text-gray-600 backdrop-blur-sm"
                    disabled={isLoading}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about anything on this page..."
                    className="flex-1 px-4 py-3 border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/80 backdrop-blur-sm text-sm"
                    disabled={isLoading}
                  />
                  <button 
                    type="submit"
                    disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
                    className="bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            </>
          )}
        </div>
      )}
    </div>
  )
} 