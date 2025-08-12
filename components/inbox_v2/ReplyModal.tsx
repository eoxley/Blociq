"use client"

import { useEffect, useState, useRef } from 'react'
import { X, Send, Brain, Loader2, Paperclip, Bold, Italic, List, Link, Quote, Undo, Redo } from 'lucide-react'

interface ReplyModalProps {
  isOpen: boolean
  onClose: () => void
  message: any | null
  replyType: 'reply' | 'replyAll'
}

interface EmailThread {
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
}

export default function ReplyModal({ isOpen, onClose, message, replyType }: ReplyModalProps) {
  const [htmlBody, setHtmlBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showBlocIQNote, setShowBlocIQNote] = useState(false)
  const [emailThread, setEmailThread] = useState<EmailThread[]>([])
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const [showFullThread, setShowFullThread] = useState(false)
  const [subject, setSubject] = useState('')
  const [toRecipients, setToRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  
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

  const formatEmailList = (emails: string[]) => {
    if (emails.length === 0) return 'None'
    return emails.join(', ')
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
        className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Panel */}
      <div className="fixed inset-x-4 top-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-auto md:w-[900px] lg:w-[1000px] rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {replyType === 'reply' ? 'Reply' : 'Reply All'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Email Form */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Recipients and Subject */}
          <div className="p-4 border-b border-gray-200 space-y-3 flex-shrink-0">
            {/* To */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 w-12">To:</label>
              <div className="flex-1 flex flex-wrap gap-2">
                {toRecipients.map((email, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md">
                    {email}
                    <button
                      onClick={() => removeRecipient('to', index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => addRecipient('to')}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  + Add
                </button>
              </div>
            </div>
            
            {/* CC */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 w-12">CC:</label>
              <div className="flex-1 flex flex-wrap gap-2">
                {ccRecipients.map((email, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-md">
                    {email}
                    <button
                      onClick={() => removeRecipient('cc', index)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => addRecipient('cc')}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  + Add
                </button>
              </div>
            </div>
            
            {/* Subject */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 w-12">Subject:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter subject"
              />
            </div>
          </div>
          
          {/* Editor Toolbar */}
          <div className="border-b border-gray-300 p-2 bg-gray-50 flex-shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => document.execCommand('bold', false)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                onClick={() => document.execCommand('italic', false)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                onClick={() => document.execCommand('insertUnorderedList', false)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => document.execCommand('createLink', false)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                title="Insert Link"
              >
                <Link className="h-4 w-4" />
              </button>
              <button
                onClick={() => setHtmlBody(htmlBody + '<blockquote>Quote</blockquote>')}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                title="Quote"
              >
                <Quote className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Editor */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div
              ref={editorRef}
              contentEditable
              className="flex-1 p-4 focus:outline-none prose prose-sm max-w-none overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: htmlBody }}
              onInput={(e) => setHtmlBody(e.currentTarget.innerHTML)}
              style={{ minHeight: '200px' }}
            />
          </div>
          
          {/* Email Thread */}
          {emailThread.length > 0 && (
            <div className="border-t border-gray-200 flex-shrink-0">
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Email Thread</h4>
                  <button
                    onClick={() => setShowFullThread(!showFullThread)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {showFullThread ? 'Show Less' : 'Show Full Thread'}
                  </button>
                </div>
              </div>
              
              <div 
                ref={threadRef}
                className={`overflow-y-auto transition-all duration-300 ${
                  showFullThread ? 'max-h-96' : 'max-h-32'
                }`}
              >
                <div className="p-3 space-y-3">
                  {emailThread.map((threadMessage, index) => (
                    <div key={threadMessage.id} className="border-l-2 border-gray-200 pl-3">
                      <div className="text-xs text-gray-500 mb-1">
                        {threadMessage.from?.emailAddress?.address || threadMessage.from?.emailAddress} • {new Date(threadMessage.receivedDateTime).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-700 line-clamp-2">
                        <div 
                          className="prose prose-xs max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: sanitizeHtml(threadMessage.body?.content || '') 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleGenerateWithBlocIQ}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Brain className="h-4 w-4" />
            Generate with Ask BlocIQ
          </button>
          
          {showBlocIQNote && (
            <div className="absolute bottom-20 left-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 max-w-xs">
              <Brain className="h-4 w-4 inline mr-2" />
              Ask BlocIQ integration coming soon! This will allow AI-powered email drafting.
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !htmlBody.trim() || toRecipients.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md transition-colors"
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
