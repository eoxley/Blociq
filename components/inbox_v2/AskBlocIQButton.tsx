"use client"

import { useState } from 'react'
import { Brain, X, MessageSquare, Upload, Send, Sparkles, Zap } from 'lucide-react'
import { useUser } from '@supabase/auth-helpers-react'

interface AskBlocIQButtonProps {
  selectedMessage?: any
  className?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  files?: any[]
}

interface AIResponse {
  success: boolean
  response?: string
  error?: string
}

export default function AskBlocIQButton({ selectedMessage, className = "" }: AskBlocIQButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const user = useUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() && uploadedFiles.length === 0) return
    if (!user) return

    // Add user message to history
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    
    try {
      // Create FormData if files are uploaded
      let requestBody: FormData | string
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (uploadedFiles.length > 0) {
        const formData = new FormData()
        formData.append('prompt', question.trim())
        
        uploadedFiles.forEach((file) => {
          formData.append('file', file)
        })
        
        requestBody = formData
        delete headers['Content-Type']
      } else {
        requestBody = JSON.stringify({
          prompt: question.trim(),
          contextType: 'email',
          emailContext: selectedMessage ? {
            subject: selectedMessage.subject,
            from: selectedMessage.from?.emailAddress?.address,
            body: selectedMessage.bodyPreview
          } : undefined
        })
      }

      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers,
        body: requestBody,
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data: AIResponse = await response.json()
      
      if (data.success && data.response) {
        // Add assistant message to history
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])
        setQuestion('')
        setUploadedFiles([])
      } else {
        throw new Error(data.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('AI Input error:', error)
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return
    
    const newFiles = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }

  return (
    <>
      {/* Enhanced Floating Button with Pulsating Brain */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 z-50 group ${className}`}
        title="Ask BlocIQ AI Assistant"
      >
        {/* Pulsating Brain Icon */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Brain className="h-8 w-8 mx-auto animate-pulse group-hover:animate-none transition-all duration-300" />
          
          {/* Pulsating Ring Effect */}
          <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse"></div>
          
          {/* Sparkle Effects */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce opacity-80"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full animate-bounce opacity-80" style={{ animationDelay: '0.5s' }}></div>
        </div>
      </button>

      {/* Enhanced Modal with Blociq Design */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-100 overflow-hidden">
            {/* Enhanced Header with Gradient */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] opacity-10"></div>
              <div className="relative flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] rounded-2xl flex items-center justify-center shadow-lg">
                      <Brain className="h-7 w-7 text-white" />
                    </div>
                    {/* Floating sparkles around the brain */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#4f46e5] to-[#a855f7] bg-clip-text text-transparent">
                      Ask BlocIQ
                    </h2>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      AI-powered email assistant
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Enhanced Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-96 bg-gradient-to-b from-gray-50/50 to-white">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="relative mb-6">
                    <MessageSquare className="h-16 w-16 mx-auto text-gray-300" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center">
                      <Zap className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-2">Start a conversation with BlocIQ AI</p>
                  <p className="text-sm text-gray-500">Ask questions, get insights, or analyze your emails</p>
                  {selectedMessage && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Context:</span> Email from {selectedMessage.from?.emailAddress?.address}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      {message.files && message.files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.files.map((file, index) => (
                            <div key={index} className="text-xs opacity-80 bg-white/20 rounded-lg px-2 py-1">
                              📎 {file.name}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className={`text-xs mt-2 opacity-70 ${message.role === 'user' ? 'text-white/80' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#4f46e5] rounded-full animate-spin"></div>
                      </div>
                      <span className="text-sm text-gray-600">BlocIQ is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Input Form */}
            <div className="p-6 border-t border-gray-200 bg-gray-50/50">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Enhanced File Upload Area */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-[#4f46e5]" />
                      Uploaded Files:
                    </p>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                          <span className="text-sm text-gray-600 font-medium">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced File Upload */}
                <div
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
                    isDragOver 
                      ? 'border-[#4f46e5] bg-blue-50/50 shadow-lg' 
                      : 'border-gray-300 hover:border-[#4f46e5] hover:bg-blue-50/30'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop files here, or{' '}
                    <label className="text-[#4f46e5] hover:text-[#4338ca] cursor-pointer font-medium">
                      browse
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        accept=".pdf,.doc,.docx,.txt"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">Supports PDF, Word, and text files</p>
                </div>

                {/* Enhanced Question Input */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask BlocIQ anything about this email..."
                      className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent shadow-sm transition-all duration-200"
                      disabled={isLoading}
                    />
                    {question && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || (!question.trim() && uploadedFiles.length === 0)}
                    className="px-8 py-3 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-xl hover:from-[#4338ca] hover:to-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Send className="h-4 w-4" />
                    Ask
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
