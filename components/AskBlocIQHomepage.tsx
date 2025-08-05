'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, MessageCircle, Upload, FileText, X, Plus, Copy, Check, Search } from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { toast } from 'sonner'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  files?: UploadedFile[]
}

type AIResponse = {
  success: boolean
  response?: string
  result?: string
  documentSearch?: boolean
  documents?: any[]
  ai_log_id?: string
  context_type?: string
  building_id?: string
  document_count?: number
  has_email_thread?: boolean
  has_leaseholder?: boolean
  context?: {
    complianceUsed?: boolean
    majorWorksUsed?: boolean
  }
}

type DocumentSearchResult = {
  id: string
  title: string
  document_url: string
  extracted_date: string
  summary: string
}

type UploadedFile = {
  file: File
  id: string
  name: string
  size: number
  type: string
}

export default function AskBlocIQHomepage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [prompt])

  // Auto-scroll removed - let users control their own scrolling

  // File handling functions
  const acceptedFileTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  const maxFileSize = 10 * 1024 * 1024 // 10MB
  const maxFiles = 5

  const validateFile = (file: File): boolean => {
    if (!acceptedFileTypes.includes(file.type)) {
      toast.error(`File type not supported. Please upload PDF, DOCX, or TXT files.`)
      return false
    }
    
    if (file.size > maxFileSize) {
      toast.error(`File too large. Please upload files smaller than 10MB.`)
      return false
    }
    
    if (uploadedFiles.length >= maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed.`)
      return false
    }
    
    return true
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    
    Array.from(files).forEach(file => {
      if (validateFile(file)) {
        const fileId = Math.random().toString(36).substr(2, 9)
        const uploadedFile: UploadedFile = {
          file,
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type
        }
        
        setUploadedFiles(prev => [...prev, uploadedFile])
        toast.success(`Uploaded: ${file.name}`)
      }
    })
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
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
    handleFileSelect(e.dataTransfer.files)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!prompt.trim() && uploadedFiles.length === 0) || isLoading) return

    // Check if this is a document search command
    const searchCommands = ['show me', 'find', 'search for', 'locate', 'where is']
    const isSearchCommand = searchCommands.some(cmd => 
      prompt.toLowerCase().includes(cmd.toLowerCase())
    )

    if (isSearchCommand) {
      await handleDocumentSearch(prompt.trim())
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setPrompt('')
    setUploadedFiles([])
    setIsLoading(true)

    try {
      // Create FormData if files are uploaded
      let requestBody: FormData | string
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (userMessage.files && userMessage.files.length > 0) {
        requestBody = new FormData()
        requestBody.append('prompt', userMessage.content)
        requestBody.append('building_id', 'null')
        
        userMessage.files.forEach((uploadedFile) => {
          requestBody.append(`file`, uploadedFile.file)
          requestBody.append(`fileName`, uploadedFile.name)
        })
        
        delete headers['Content-Type']
      } else {
        requestBody = JSON.stringify({
          prompt: userMessage.content,
          building_id: null
        })
      }

      const response = await fetch('/api/ask-ai-public', {
        method: 'POST',
        headers,
        body: requestBody,
      })

      const data: AIResponse = await response.json()

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.result || data.response, // Handle both response formats
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])
      } else if (response.status === 401) {
        // Handle authentication error gracefully
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
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
      
      // Provide a helpful response even when AI fails
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment, or contact support if the issue persists.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDocumentSearch = async (searchQuery: string) => {
    setIsSearching(true)
    setSearchResults([])
    
    try {
      const response = await fetch('/api/search-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setSearchResults(data.results || [])
      
      // Add search results to messages
      const searchMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Found ${data.results?.length || 0} documents matching your search.`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, searchMessage])
      setPrompt('')
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(e as any)
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Submit on Enter (but not Shift+Enter for new lines)
      e.preventDefault()
      if (prompt.trim() || uploadedFiles.length > 0) {
        handleSubmit(e as any)
      }
    }
  }

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('text')) return '📄'
    return '📎'
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl border border-gray-200">
      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-300 ease-in-out`}
          >
            <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              <div className={`rounded-2xl px-4 py-3 ${
                message.role === 'user' 
                  ? 'bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {/* Message Content */}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
                
                {/* Files */}
                {message.files && message.files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.files.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 text-sm">
                        <span>{getFileIcon(file.type)}</span>
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs opacity-70">({formatFileSize(file.size)})</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Timestamp */}
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
              
              {/* Copy Button for Assistant Messages */}
              {message.role === 'assistant' && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedMessageId === message.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Message */}
        {isLoading && (
          <div className="flex justify-start transition-all duration-300 ease-in-out">
            <div className="max-w-[80%]">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-lg flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin text-[#008C8F]" />
                    <span className="text-sm text-gray-600">BlocIQ is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
                 )}
       </div>

      {/* Search Results Section */}
      {searchResults.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600" />
            Search Results ({searchResults.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchResults.map((doc, index) => (
              <div
                key={doc.id || index}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm text-gray-900 truncate">
                    {doc.file_name || doc.title || 'Document'}
                  </h4>
                  <BlocIQBadge className="text-xs bg-gray-100 text-gray-700">
                    {doc.doc_type || 'Document'}
                  </BlocIQBadge>
                </div>
                {doc.summary && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {doc.summary}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{doc.building_name || 'Unknown Building'}</span>
                  <span>{new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => {
                    setPrompt(`Tell me about the document "${doc.file_name || doc.title}"`)
                  }}
                  className="mt-2 w-full text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                >
                  Ask About This
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* File Upload Zone */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 transition-all duration-300 ease-in-out">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  <span>{getFileIcon(file.type)}</span>
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Input */}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask BlocIQ anything, upload documents, or search for files (e.g., 'show me the last FRA')..."
              className="w-full px-4 py-3 pr-20 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent transition-all duration-200 resize-none text-gray-900 placeholder-gray-500"
              rows={1}
              disabled={isLoading}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            
            {/* File Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploadedFiles.length >= maxFiles}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Attach a document"
            >
              <Plus className="h-4 w-4" />
            </button>
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || (!prompt.trim() && uploadedFiles.length === 0)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-[#008C8F] to-[#7645ED] hover:from-[#007B8A] hover:to-[#6B3FD8] disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-sm"
              title="Send with BlocIQ"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 ${
              isDragOver 
                ? 'border-[#008C8F] bg-[#008C8F]/5' 
                : 'border-gray-300 hover:border-[#008C8F] hover:bg-[#008C8F]/5'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-600">
                Drag & drop files here or{' '}
                <span 
                  className="text-[#008C8F] underline cursor-pointer hover:text-[#007B8A]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  click to upload
                </span>
              </p>
              <p className="text-xs text-white">
                Supports PDF, DOCX, TXT (max 10MB, up to {maxFiles} files)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Keyboard Shortcut Hint */}
          <p className="text-xs text-gray-500 text-center">
            Press Cmd+Enter to send
          </p>
        </form>
      </div>
    </div>
  )
} 