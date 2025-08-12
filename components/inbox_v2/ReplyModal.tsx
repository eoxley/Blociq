"use client"

import { useEffect, useState, useRef } from 'react'
import { Reply, ReplyAll, Paperclip, Clock, User, MessageSquare, Calendar, Download, Brain, Sparkles, Loader2, X, Send } from 'lucide-react'
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
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [emailThread, setEmailThread] = useState<FullMessage[]>([])
  const [subject, setSubject] = useState('')
  const [toRecipients, setToRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  const [bccRecipients, setBccRecipients] = useState<string[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiGenerationError, setAiGenerationError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          setBccRecipients([])
        } else {
          // Reply all - include original recipients
          const originalTo = message.toRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || []
          const originalCc = message.ccRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || []
          const sender = message.from?.emailAddress?.address || message.from?.emailAddress || ''
          
          // Remove sender from recipients if they're already there
          setToRecipients(originalTo.filter((email: string) => email !== sender))
          setCcRecipients([...originalCc, sender].filter((email: string) => email !== ''))
          setBccRecipients([])
        }
      
      // Initialize reply body with proper cursor positioning
      setHtmlBody('<p><br></p>')
      
      // Load email thread
      loadEmailThread()
    }
  }, [isOpen, message, replyType])

  // Load email thread for context
  const loadEmailThread = async () => {
    // Always start with the current message in the thread
    const currentThread = [message]
    
    if (!message?.conversationId) {
      // If no conversation ID, just show the current message
      setEmailThread(currentThread)
      return
    }
    
    try {
      const response = await fetch(`/api/outlook/v2/messages/thread?conversationId=${message.conversationId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.items && data.items.length > 0) {
          // Filter out the current message to avoid duplication
          const otherMessages = data.items.filter((item: any) => item.id !== message.id)
          setEmailThread([...currentThread, ...otherMessages])
        } else {
          // Fallback to single message if thread loading fails
          setEmailThread(currentThread)
        }
      } else {
        // Fallback to single message if thread loading fails
        setEmailThread(currentThread)
      }
    } catch (error) {
      console.error('Error loading email thread:', error)
      // Fallback to single message if thread loading fails
      setEmailThread(currentThread)
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
        if (editorRef.current) {
          editorRef.current.focus()
          // Ensure cursor is at the end of content
          const range = document.createRange()
          const selection = window.getSelection()
          if (editorRef.current.lastChild && editorRef.current.lastChild.nodeType === Node.ELEMENT_NODE) {
            range.setStartAfter(editorRef.current.lastChild)
            range.collapse(true)
          } else {
            range.selectNodeContents(editorRef.current)
            range.collapse(false)
          }
          selection?.removeAllRanges()
          selection?.addRange(range)
        }
      }, 100)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!message || !htmlBody.trim()) return
    
    setIsSending(true)
    setSendError(null)
    setSendSuccess(false)
    
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
          bcc: bccRecipients.filter(Boolean),
          subject: subject.trim(),
          htmlBody: htmlBody.trim()
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.ok) {
        setSendSuccess(true)
        console.log('Reply sent successfully')
        
        // Show success message briefly before closing
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        const errorMessage = data?.error || 'Failed to send reply'
        setSendError(errorMessage)
        console.error('Failed to send reply:', errorMessage)
      }
    } catch (error) {
      const errorMessage = 'Network error while sending reply'
      setSendError(errorMessage)
      console.error('Error sending reply:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleGenerateAIReply = async () => {
    if (!message) return
    
    setIsGeneratingAI(true)
    setAiGenerationError(null)
    
    try {
      // Create a prompt for AI reply generation
      const aiPrompt = `Generate a professional email reply to this email:

From: ${message.from?.emailAddress?.address || message.from?.emailAddress || 'Unknown'}
Subject: ${message.subject || '(No subject)'}
Content: ${message.body?.content || ''}

Please generate a professional, contextual reply that:
1. Addresses the original sender appropriately
2. Provides a relevant response to the email content
3. Maintains professional tone and formatting
4. Is concise but comprehensive
5. Uses proper email etiquette

Generate the reply in plain text format (no HTML tags).`

      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          context: 'email_reply_generation'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.response) {
          // Clean the AI response and convert to HTML
          let aiReply = data.response.trim()
          
          // Convert plain text to HTML paragraphs
          const paragraphs = aiReply.split('\n').filter((line: string) => line.trim())
          const htmlReply = paragraphs.map((line: string) => `<p>${line}</p>`).join('')
          
          // Insert the AI reply at the beginning of the editor
          setHtmlBody(htmlReply)
          
          // Focus the editor and position cursor at the end
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.focus()
              // Position cursor at the end
              const range = document.createRange()
              const selection = window.getSelection()
              if (editorRef.current.lastChild) {
                range.setStartAfter(editorRef.current.lastChild)
                range.collapse(true)
              } else {
                range.selectNodeContents(editorRef.current)
                range.collapse(false)
              }
              selection?.removeAllRanges()
              selection?.addRange(range)
            }
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachments(prev => [...prev, ...files])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const addRecipient = (type: 'to' | 'cc' | 'bcc') => {
    const newEmail = prompt(`Enter ${type.toUpperCase()} email address:`)
    if (newEmail && newEmail.trim()) {
      if (type === 'to') {
        setToRecipients([...toRecipients, newEmail.trim()])
      } else if (type === 'cc') {
        setCcRecipients([...ccRecipients, newEmail.trim()])
      } else {
        setBccRecipients([...bccRecipients, newEmail.trim()])
      }
    }
  }

  const removeRecipient = (type: 'to' | 'cc' | 'bcc', index: number) => {
    if (type === 'to') {
      setToRecipients(toRecipients.filter((_, i) => i !== index))
    } else if (type === 'cc') {
      setCcRecipients(ccRecipients.filter((_, i) => i !== index))
    } else {
      setBccRecipients(bccRecipients.filter((_, i) => i !== index))
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
    
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
    
    // Allow images but ensure they're safe
    sanitized = sanitized
      .replace(/<img([^>]*?)>/gi, (match, attributes) => {
        // Only allow safe image attributes
        const safeAttributes = attributes
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
          .replace(/javascript:/gi, '') // Remove javascript: URLs
          .replace(/data:/gi, '') // Remove data: URLs
          .replace(/<[^>]*>/gi, '') // Remove any nested tags
        return `<img${safeAttributes}>`
      })
    
    return sanitized
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Panel */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-auto md:w-[900px] lg:w-[1000px] rounded-3xl bg-white shadow-2xl max-h-[95vh] flex flex-col z-[10000] border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {replyType === 'reply' ? 'Reply' : 'Reply All'}
              </h2>
              <p className="text-sm text-gray-600 font-medium">Compose your response</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Email Info Card */}
          {message && (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">From:</span>
                    <span className="ml-2 text-gray-900 font-medium">{message.from?.emailAddress?.address || message.from?.emailAddress || 'Unknown'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Subject:</span>
                    <span className="ml-2 text-gray-900 font-medium">{message.subject || '(No subject)'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Recipients Management */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="space-y-5">
              {/* To Recipients */}
              <div className="flex items-start gap-4">
                <label className="text-sm font-semibold text-gray-700 w-20 pt-3">To:</label>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-3 mb-3">
                    {toRecipients.map((email, index) => (
                      <span key={index} className="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm rounded-xl border-2 border-blue-200 shadow-sm">
                        {email}
                        <button
                          onClick={() => removeRecipient('to', index)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-1.5 transition-all duration-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => addRecipient('to')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold hover:bg-blue-50 px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    + Add recipient
                  </button>
                </div>
              </div>
              
              {/* CC Recipients */}
              <div className="flex items-start gap-4">
                <label className="text-sm font-semibold text-gray-700 w-20 pt-3">CC:</label>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-3 mb-3">
                    {ccRecipients.map((email, index) => (
                      <span key={index} className="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-100 to-blue-50 text-gray-800 text-sm rounded-xl border-2 border-gray-200 shadow-sm">
                        {email}
                        <button
                          onClick={() => removeRecipient('cc', index)}
                          className="text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full p-1.5 transition-all duration-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => addRecipient('cc')}
                    className="text-gray-600 hover:text-gray-800 text-sm font-semibold hover:bg-gray-50 px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    + Add CC
                  </button>
                </div>
              </div>
              
              {/* BCC Recipients */}
              <div className="flex items-start gap-4">
                <label className="text-sm font-semibold text-gray-700 w-20 pt-3">BCC:</label>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-3 mb-3">
                    {bccRecipients.map((email, index) => (
                      <span key={index} className="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-100 to-blue-50 text-gray-800 text-sm rounded-xl border-2 border-gray-200 shadow-sm">
                        {email}
                        <button
                          onClick={() => removeRecipient('bcc', index)}
                          className="text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full p-1.5 transition-all duration-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => addRecipient('bcc')}
                    className="text-gray-600 hover:text-gray-800 text-sm font-semibold hover:bg-gray-50 px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    + Add BCC
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Reply Generation Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerateAIReply}
              disabled={isGeneratingAI}
              className="group relative inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-4">
                {isGeneratingAI ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <Brain className="h-7 w-7" />
                )}
                <span className="text-xl">
                  {isGeneratingAI ? 'Generating AI Reply...' : 'Generate AI Reply'}
                </span>
              </div>
            </button>
          </div>
          
          {/* AI Generation Error */}
          {aiGenerationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 shadow-sm">
              <span className="font-medium">AI Generation Error:</span> {aiGenerationError}
            </div>
          )}
          
          {/* Send Success/Error Messages */}
          {sendSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 shadow-sm">
              <span className="font-medium">✅ Reply sent successfully! Closing in a moment...</span>
            </div>
          )}
          
          {sendError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 shadow-sm">
              <span className="font-medium">❌ Send Error:</span> {sendError}
            </div>
          )}
          
          {/* Editor */}
          <div className="border-2 border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => {
                    document.execCommand('bold', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-bold shadow-sm hover:shadow-md"
                  title="Bold"
                >
                  B
                </button>
                <button
                  onClick={() => {
                    document.execCommand('italic', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 italic shadow-sm hover:shadow-md"
                  title="Italic"
                >
                  I
                </button>
                <button
                  onClick={() => {
                    document.execCommand('underline', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 underline shadow-sm hover:shadow-md"
                  title="Underline"
                >
                  U
                </button>
                <button
                  onClick={() => {
                    document.execCommand('insertUnorderedList', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Bullet List"
                >
                  •
                </button>
                <button
                  onClick={() => {
                    document.execCommand('insertOrderedList', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Numbered List"
                >
                  1.
                </button>
                <button
                  onClick={() => {
                    document.execCommand('insertHorizontalRule', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Horizontal Line"
                >
                  ─
                </button>
                <div className="w-px h-8 bg-gray-300 mx-2"></div>
                <button
                  onClick={() => {
                    document.execCommand('justifyLeft', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Align Left"
                >
                  ⬅
                </button>
                <button
                  onClick={() => {
                    document.execCommand('justifyCenter', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Align Center"
                >
                  ↔
                </button>
                <button
                  onClick={() => {
                    document.execCommand('justifyRight', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Align Right"
                >
                  ➡
                </button>
                <div className="w-px h-8 bg-gray-300 mx-2"></div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                  title="Attach File"
                >
                  <Paperclip className="h-4 w-4" />
                  Attach
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                />
              </div>
            </div>
            <div
              ref={editorRef}
              contentEditable
              className="p-6 min-h-[300px] focus:outline-none prose prose-lg max-w-none text-gray-900 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: htmlBody }}
              onInput={(e) => setHtmlBody(e.currentTarget.innerHTML)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  document.execCommand('insertParagraph', false, undefined)
                }
              }}
              onFocus={() => {
                if (editorRef.current) {
                  const range = document.createRange()
                  const selection = window.getSelection()
                  if (editorRef.current.lastChild && editorRef.current.lastChild.nodeType === Node.ELEMENT_NODE) {
                    range.setStartAfter(editorRef.current.lastChild)
                    range.collapse(true)
                  } else {
                    range.selectNodeContents(editorRef.current)
                    range.collapse(false)
                  }
                  selection?.removeAllRanges()
                  selection?.addRange(range)
                }
              }}
              onClick={() => {
                editorRef.current?.focus()
              }}
            />
          </div>
          
          {/* Attachments Display */}
          {attachments.length > 0 && (
            <div className="border-2 border-gray-200 rounded-2xl bg-gradient-to-r from-gray-50 to-blue-50 p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({attachments.length})
              </div>
              <div className="space-y-3">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Email Thread Display */}
          {emailThread.length > 0 && (
            <div className="border-2 border-gray-200 rounded-2xl bg-gradient-to-r from-gray-50 to-blue-50 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-100 to-blue-100">
                <div className="flex items-center gap-3 text-sm text-gray-700 font-semibold">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">
                    Email Thread ({emailThread.length} message{emailThread.length !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto p-4 space-y-4">
                {emailThread.map((threadMessage, index) => (
                  <div
                    key={threadMessage.id}
                    className={`p-4 rounded-xl border-2 ${
                      threadMessage.id === message?.id
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md'
                        : 'bg-white border-gray-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3 text-xs text-gray-600">
                      <User className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">
                        {threadMessage.from?.emailAddress?.address || threadMessage.from?.emailAddress || 'Unknown'}
                      </span>
                      <span>•</span>
                      <Clock className="h-4 w-4 text-indigo-500" />
                      <span>{formatDistanceToNow(new Date(threadMessage.receivedDateTime), { addSuffix: true })}</span>
                      {threadMessage.id === message?.id && (
                        <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                          Original Message
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-800">
                      <div className="font-medium mb-2 text-gray-900">{threadMessage.subject || '(No subject)'}</div>
                      <div 
                        className="text-gray-700 prose prose-sm max-w-none leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(threadMessage.body?.content || 'No content')
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-b-3xl">
          <button
            onClick={handleGenerateAIReply}
            className="flex items-center gap-3 px-6 py-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            <Brain className="h-5 w-5" />
            {isGeneratingAI ? 'Generating AI Reply...' : 'Generate with Ask BlocIQ'}
          </button>
          
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-8 py-3 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !htmlBody.trim()}
              className="flex items-center gap-3 px-8 py-3 text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:shadow-sm"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
