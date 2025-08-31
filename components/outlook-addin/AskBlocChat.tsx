'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, MessageCircle, Upload, FileText, X, Plus, Search, Mail, User, Calendar, AlertCircle } from 'lucide-react'
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

type UploadedFile = {
  file: File
  id: string
  name: string
  size: number
  type: string
}

type EmailContext = {
  subject: string
  sender?: string
  senderName?: string
  body: string
  id: string
  importance?: number
  itemType?: string
  dateTimeCreated?: string
}

export default function AskBlocChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // NEW: Email context state
  const [currentEmail, setCurrentEmail] = useState<EmailContext | null>(null)
  const [isOfficeReady, setIsOfficeReady] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Initialize Office.js and get email context
  useEffect(() => {
    if (typeof Office !== 'undefined') {
      Office.onReady((info) => {
        console.log('Office.js ready:', info)
        setIsOfficeReady(true)
        getCurrentEmailContext()
      })
    } else {
      // For testing outside Outlook
      setIsOfficeReady(true)
      console.log('Office.js not available - running in development mode')
    }
  }, [])

  // Auto-resize textarea with better handling for long text
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      // Allow up to 200px height for better visibility of long text
      const newHeight = Math.min(inputRef.current.scrollHeight, 200)
      inputRef.current.style.height = `${newHeight}px`
      
      // If content exceeds max height, add scrollbar styling and ensure proper positioning
      if (inputRef.current.scrollHeight > 200) {
        inputRef.current.style.overflowY = 'auto'
        // Ensure cursor is visible by scrolling to bottom when typing
        if (inputRef.current === document.activeElement) {
          inputRef.current.scrollTop = inputRef.current.scrollHeight
        }
      } else {
        inputRef.current.style.overflowY = 'hidden'
      }
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [prompt])

  // NEW: Get current email from Outlook
  const getCurrentEmailContext = async () => {
    try {
      if (typeof Office !== 'undefined' && Office.context?.mailbox?.item) {
        const item = Office.context.mailbox.item
        
        // Get email body
        item.body.getAsync(Office.CoercionType.Text, (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            const emailContext: EmailContext = {
              subject: item.subject || 'No Subject',
              sender: item.sender?.emailAddress || 'Unknown',
              senderName: item.sender?.displayName || 'Unknown Sender',
              body: result.value || '',
              id: item.itemId || 'unknown',
              importance: item.importance || 0,
              itemType: item.itemType || 'message',
              dateTimeCreated: item.dateTimeCreated?.toISOString() || new Date().toISOString()
            }
            
            setCurrentEmail(emailContext)
            
            // Auto-send email context to AI with welcome message
            sendInitialContext(emailContext)
          } else {
            console.error('Failed to get email body:', result.error)
            setEmailError('Could not read email content')
          }
        })
      } else {
        console.log('No email item available - may be in development mode')
      }
    } catch (error) {
      console.error('Error getting email context:', error)
      setEmailError('Error reading email: ' + (error as Error).message)
    }
  }

  // NEW: Send email context to AI automatically
  const sendInitialContext = async (emailContext: EmailContext) => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `I can see you're working on an email from **${emailContext.senderName}** with subject "**${emailContext.subject}**". 

I can help you:
📝 **Draft a reply** - Professional responses
📋 **Categorize** the email - Priority and type
🎯 **Suggest actions** - Next steps to take
❓ **Answer questions** - About the email content
🏢 **Property context** - If it relates to your buildings

What would you like me to help with?`,
      timestamp: new Date()
    }
    
    setMessages([welcomeMessage])
  }

  // File handling functions (copied exactly from homepage)
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

  // MODIFIED: Enhanced submit with email context
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (userMessage.files && userMessage.files.length > 0) {
        requestBody = new FormData()
        requestBody.append('prompt', userMessage.content)
        requestBody.append('building_id', 'null')
        
        // NEW: Add email context to FormData
        if (currentEmail) {
          requestBody.append('email_context', JSON.stringify(currentEmail))
        }
        
        userMessage.files.forEach((uploadedFile) => {
          requestBody.append(`file`, uploadedFile.file)
          requestBody.append(`fileName`, uploadedFile.name)
        })
        
        delete headers['Content-Type']
      } else {
        requestBody = JSON.stringify({
          prompt: userMessage.content,
          building_id: null,
          is_public: true,
          // NEW: Add email context to JSON payload
          email_context: currentEmail
        })
      }

      // Use add-in specific endpoint
      const response = await fetch('/api/addin/ask-ai', {
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
          content: "I'd be happy to help! Please make sure you're signed in to use the full AI features.",
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
        body: JSON.stringify({ 
          query: searchQuery,
          // NEW: Include email context in search
          email_context: currentEmail 
        }),
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

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('Failed to copy to clipboard')
    }
  }

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  if (!isOfficeReady) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading BlocIQ Add-in</h3>
          <p className="text-gray-600 text-sm">Connecting to Outlook...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* NEW: Email context header */}
      {currentEmail && (
        <div className="flex-shrink-0 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-blue-900 truncate">{currentEmail.subject}</h3>
              <p className="text-sm text-blue-700 flex items-center gap-1">
                <User className="h-3 w-3" />
                {currentEmail.senderName}
              </p>
              {currentEmail.dateTimeCreated && (
                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(currentEmail.dateTimeCreated).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {emailError && (
        <div className="flex-shrink-0 p-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{emailError}</span>
          </div>
        </div>
      )}

      {/* Messages (copied exactly from homepage) */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className={`max-w-[85%] ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-3 relative group`}>
              {/* Files display for user messages */}
              {message.files && message.files.length > 0 && (
                <div className="mb-3 space-y-2">
                  {message.files.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 bg-white/20 rounded-lg">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium truncate flex-1">
                        {file.name}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                {message.role === 'assistant' && (
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 ml-2"
                    title="Copy to clipboard"
                  >
                    {copiedMessageId === message.id ? '✓' : '📋'}
                  </button>
                )}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1 text-white font-semibold text-sm">
                U
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              <span className="text-gray-600">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area (copied exactly from homepage) */}
      <div 
        className={`flex-shrink-0 border-t bg-white transition-colors duration-200 ${isDragOver ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-4">
          {/* File upload area */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium truncate flex-1">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={currentEmail ? `Ask me about this email or anything else...` : `Ask me anything about your property management...`}
                  className="w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 min-h-[50px] max-h-[200px]"
                  style={{ scrollbarWidth: 'thin' }}
                  disabled={isLoading}
                  rows={1}
                />
                
                <div className="absolute right-2 top-2 flex gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={acceptedFileTypes.join(',')}
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Upload files"
                    disabled={isLoading || uploadedFiles.length >= maxFiles}
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  
                  <BlocIQButton
                    type="submit"
                    disabled={(!prompt.trim() && uploadedFiles.length === 0) || isLoading}
                    className="p-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </BlocIQButton>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {currentEmail ? 'AI assistance for your email' : 'AI powered by BlocIQ'} • Press Enter to send, Shift+Enter for new line
              </span>
              <span>
                {uploadedFiles.length}/{maxFiles} files
              </span>
            </div>
          </form>

          {isDragOver && (
            <div className="absolute inset-0 bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-blue-600 font-medium">Drop files here to upload</p>
                <p className="text-blue-500 text-sm">PDF, DOCX, TXT files up to 10MB</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}