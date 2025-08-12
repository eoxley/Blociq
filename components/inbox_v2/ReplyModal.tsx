"use client"

import { useEffect, useState, useRef } from 'react'
import { Reply, ReplyAll, Paperclip, Clock, User, Mail, Calendar, Download, Brain, Sparkles, Loader2, X, Send } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface ReplyModalProps {
  isOpen: boolean
  onClose: () => void
  message: any | null
  replyType: 'reply' | 'replyAll'
}

interface FullMessage {
  id: string
  subject: string
  from: any
  toRecipients: any[]
  ccRecipients: any[]
  receivedDateTime: string
  body: {
    contentType: string
    content: string
  }
  hasAttachments: boolean
  attachments: any[]
  conversationId: string
  webLink: string
}

export default function ReplyModal({ isOpen, onClose, message, replyType }: ReplyModalProps) {
  const [htmlBody, setHtmlBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showBlocIQNote, setShowBlocIQNote] = useState(false)
  const [emailThread, setEmailThread] = useState<FullMessage[]>([])
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const [showFullThread, setShowFullThread] = useState(false)
  const [subject, setSubject] = useState('')
  const [toRecipients, setToRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiGenerationError, setAiGenerationError] = useState<string | null>(null)
  
  const editorRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)

  // Initialize reply content and recipients when modal opens
  useEffect(() => {
    if (isOpen && message) {
      // Set subject with Re: prefix if not already present
      const currentSubject = message.subject || '(No subject)'
      setSubject(currentSubject.startsWith('Re:') ? currentSubject : `Re: ${currentSubject}`)
      
      // Set recipients based on reply type
      if (replyType === 'reply') {
        setToRecipients([message.from?.emailAddress?.address || message.from?.emailAddress || ''])
        setCcRecipients([])
      } else {
        // Reply all - include original recipients
        const originalTo = message.toRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || []
        const originalCc = message.ccRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || []
        const sender = message.from?.emailAddress?.address || message.from?.emailAddress || ''
        
        // Remove sender from recipients if they're already there
        setToRecipients(originalTo.filter((email: string) => email !== sender))
        setCcRecipients([...originalCc, sender].filter((email: string) => email !== ''))
      }
      
      // Initialize reply body
      setHtmlBody('<p><br></p>')
      
      // Load email thread
      loadEmailThread()
    }
  }, [isOpen, message, replyType])

  // Load email thread for context
  const loadEmailThread = async () => {
    if (!message?.conversationId) return
    
    setIsLoadingThread(true)
    try {
      const response = await fetch(`/api/outlook/v2/messages/thread?conversationId=${message.conversationId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.items) {
          setEmailThread(data.items)
        }
      }
    } catch (error) {
      console.error('Error loading email thread:', error)
    } finally {
      setIsLoadingThread(false)
    }
  }

  // Handle body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Focus editor when modal opens
  useEffect(() => {
    if (isOpen && editorRef.current) {
      setTimeout(() => {
        editorRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!message || !htmlBody.trim()) return
    
    setIsSending(true)
    try {
      const response = await fetch('/api/outlook/v2/messages/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: message.id,
          to: toRecipients.filter(Boolean),
          cc: ccRecipients.filter(Boolean),
          subject: subject.trim(),
          htmlBody: htmlBody.trim()
        })
      })
      
      if (response.ok) {
        onClose()
        // You could add a success toast here
      } else {
        console.error('Failed to send reply')
        // You could add an error toast here
      }
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleGenerateAIReply = async () => {
    if (!message || emailThread.length === 0) return
    
    setIsGeneratingAI(true)
    setAiGenerationError(null)
    
    try {
      // Prepare the email thread context for AI
      const threadContext = emailThread.map(msg => ({
        from: msg.from?.emailAddress?.address || msg.from?.emailAddress || 'Unknown',
        subject: msg.subject || '(No subject)',
        content: msg.body?.content || '',
        receivedDateTime: msg.receivedDateTime,
        isOriginalMessage: msg.id === message.id
      }))
      
      // Create a prompt for AI reply generation
      const aiPrompt = `Generate a professional email reply based on this email thread. 
      
Original Email:
From: ${message.from?.emailAddress?.address || message.from?.emailAddress || 'Unknown'}
Subject: ${message.subject || '(No subject)'}
Content: ${message.body?.content || ''}

Thread Context: ${JSON.stringify(threadContext, null, 2)}

Please generate a professional, contextual reply that:
1. Addresses the original sender appropriately
2. Provides a relevant response to the email content
3. Maintains professional tone and formatting
4. Is concise but comprehensive
5. Uses proper email etiquette

Generate the reply in HTML format with appropriate paragraph tags and formatting.`

      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          context: 'email_reply_generation',
          threadData: threadContext
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.reply) {
          // Clean and format the AI response
          let aiReply = data.reply
          
          // Ensure it's wrapped in proper HTML
          if (!aiReply.includes('<p>') && !aiReply.includes('<div>')) {
            aiReply = aiReply.split('\n').map(line => `<p>${line}</p>`).join('')
          }
          
          // Add a separator and the AI-generated reply
          const currentContent = htmlBody === '<p><br></p>' ? '' : htmlBody
          setHtmlBody(currentContent + (currentContent ? '<br><br>' : '') + aiReply)
          
          // Focus the editor to show the generated content
          setTimeout(() => {
            editorRef.current?.focus()
          }, 100)
        } else {
          setAiGenerationError('AI generated an empty response. Please try again.')
        }
      } else {
        setAiGenerationError('Failed to generate AI reply. Please try again.')
      }
    } catch (error) {
      console.error('Error generating AI reply:', error)
      setAiGenerationError('Error generating AI reply. Please try again.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleGenerateWithBlocIQ = () => {
    setShowBlocIQNote(true)
    setTimeout(() => setShowBlocIQNote(false), 3000)
  }

  const addRecipient = (type: 'to' | 'cc') => {
    const newEmail = prompt(`Enter ${type.toUpperCase()} email address:`)
    if (newEmail && newEmail.trim()) {
      if (type === 'to') {
        setToRecipients([...toRecipients, newEmail.trim()])
      } else {
        setCcRecipients([...ccRecipients, newEmail.trim()])
      }
    }
  }

  const removeRecipient = (type: 'to' | 'cc', index: number) => {
    if (type === 'to') {
      setToRecipients(toRecipients.filter((_, i) => i !== index))
    } else {
      setCcRecipients(ccRecipients.filter((_, i) => i !== index))
    }
  }

  const formatEmailList = (recipients: any[]) => {
    if (!recipients || recipients.length === 0) return 'None'
    return recipients
      .map((r: any) => r.emailAddress?.address || r.emailAddress || r)
      .filter(Boolean)
      .join(', ')
  }

  const sanitizeHtml = (html: string) => {
    if (!html) return ''
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[9999] bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal Panel */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-auto md:w-[800px] lg:w-[900px] rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {replyType === 'reply' ? 'Reply' : 'Reply All'}
              </h2>
              <p className="text-sm text-gray-500">Compose your response</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Email Info */}
          {message && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">To:</span>
                  <span className="ml-2 text-gray-900">{message.from?.emailAddress?.address || message.from?.emailAddress || 'Unknown'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Subject:</span>
                  <span className="ml-2 text-gray-900">{message.subject || '(No subject)'}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* AI Reply Generation Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerateAIReply}
              disabled={isGeneratingAI || emailThread.length === 0}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-teal-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-3">
                {isGeneratingAI ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
                <Brain className="h-6 w-6" />
                <span className="text-lg">
                  {isGeneratingAI ? 'Generating AI Reply...' : 'Generate AI Reply'}
                </span>
              </div>
            </button>
          </div>
          
          {/* AI Generation Error */}
          {aiGenerationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <span className="font-medium">AI Generation Error:</span> {aiGenerationError}
            </div>
          )}
          
          {/* Editor */}
          <div className="border border-gray-300 rounded-lg bg-white">
            <div className="border-b border-gray-300 p-3 bg-gray-50 rounded-t-lg">
              <div className="flex gap-2">
                <button
                  onClick={() => setHtmlBody(htmlBody + '<strong>Bold</strong>')}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  B
                </button>
                <button
                  onClick={() => setHtmlBody(htmlBody + '<em>Italic</em>')}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  I
                </button>
                <button
                  onClick={() => setHtmlBody(htmlBody + '<br>')}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  ↵
                </button>
              </div>
            </div>
            <div
              ref={editorRef}
              contentEditable
              className="p-4 min-h-[250px] focus:outline-none prose prose-sm max-w-none text-gray-900"
              dangerouslySetInnerHTML={{ __html: htmlBody }}
              onInput={(e) => setHtmlBody(e.currentTarget.innerHTML)}
            />
          </div>
          
          {/* BlocIQ Note */}
          {showBlocIQNote && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <Brain className="h-4 w-4 inline mr-2" />
              Ask BlocIQ integration coming soon! This will allow AI-powered email drafting.
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white rounded-b-2xl">
          <button
            onClick={handleGenerateWithBlocIQ}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Brain className="h-4 w-4" />
            Generate with Ask BlocIQ
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !htmlBody.trim()}
              className="flex items-center gap-2 px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
