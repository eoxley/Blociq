"use client"

import { useState } from 'react'
import { Brain, X, MessageSquare, Upload, Send } from 'lucide-react'
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
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 z-50 ${className}`}
        title="Ask BlocIQ AI Assistant"
      >
        <Brain className="h-8 w-8 mx-auto" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-xl flex items-center justify-center">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Ask BlocIQ</h2>
                  <p className="text-sm text-gray-600">AI-powered email assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-96">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Start a conversation with BlocIQ AI</p>
                  {selectedMessage && (
                    <p className="text-sm mt-2">
                      Context: Email from {selectedMessage.from?.emailAddress?.address}
                    </p>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-[#4f46e5] text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.files && message.files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.files.map((file, index) => (
                            <div key={index} className="text-xs opacity-80">
                              📎 {file.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4f46e5]"></div>
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="p-6 border-t border-gray-200">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Upload Area */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <span className="text-sm text-gray-600">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Upload */}
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    isDragOver ? 'border-[#4f46e5] bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop files here, or{' '}
                    <label className="text-[#4f46e5] hover:text-[#4338ca] cursor-pointer">
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

                {/* Question Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask BlocIQ anything about this email..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || (!question.trim() && uploadedFiles.length === 0)}
                    className="px-6 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
