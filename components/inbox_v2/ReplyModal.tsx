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
  const [emailThread, setEmailThread] = useState<FullMessage[]>([])
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const [showFullThread, setShowFullThread] = useState(false)
  const [subject, setSubject] = useState('')
  const [toRecipients, setToRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiGenerationError, setAiGenerationError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  
  const editorRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
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
      } else {
        // Reply all - include original recipients
        const originalTo = message.toRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || []
        const originalCc = message.ccRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || []
        const sender = message.from?.emailAddress?.address || message.from?.emailAddress || ''
        
        // Remove sender from recipients if they're already there
        setToRecipients(originalTo.filter((email: string) => email !== sender))
        setCcRecipients([...originalCc, sender].filter((email: string) => email !== ''))
      }
      
      // Initialize reply body with proper cursor positioning
      setHtmlBody('<p><br></p>')
      
      // Load email thread
      loadEmailThread()
    }
  }, [isOpen, message, replyType])

  // Load email thread for context
  const loadEmailThread = async () => {
    if (!message?.conversationId) {
      // If no conversation ID, create a single-item thread with the current message
      setEmailThread([message])
      return
    }
    
    setIsLoadingThread(true)
    try {
      const response = await fetch(`/api/outlook/v2/messages/thread?conversationId=${message.conversationId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.items) {
          setEmailThread(data.items)
        } else {
          // Fallback to single message if thread loading fails
          setEmailThread([message])
        }
      } else {
        // Fallback to single message if thread loading fails
        setEmailThread([message])
      }
    } catch (error) {
      console.error('Error loading email thread:', error)
      // Fallback to single message if thread loading fails
      setEmailThread([message])
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
          const paragraphs = aiReply.split('\n').filter(line => line.trim())
          const htmlReply = paragraphs.map(line => `<p>${line}</p>`).join('')
          
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

  const handleGenerateWithBlocIQ = () => {
    setShowBlocIQNote(true)
    setTimeout(() => setShowBlocIQNote(false), 3000)
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
              <MessageSquare className="h-5 w-5 text-blue-600" />
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
              disabled={isGeneratingAI}
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
                  onClick={() => {
                    document.execCommand('bold', false, null)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors font-bold"
                  title="Bold"
                >
                  B
                </button>
                <button
                  onClick={() => {
                    document.execCommand('italic', false, null)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors italic"
                  title="Italic"
                >
                  I
                </button>
                <button
                  onClick={() => {
                    document.execCommand('underline', false, null)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors underline"
                  title="Underline"
                >
                  U
                </button>
                <button
                  onClick={() => {
                    document.execCommand('insertUnorderedList', false, null)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="Bullet List"
                >
                  •
                </button>
                <button
                  onClick={() => {
                    document.execCommand('insertOrderedList', false, null)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="Numbered List"
                >
                  1.
                </button>
                <button
                  onClick={() => {
                    document.execCommand('insertHorizontalRule', false, null)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="Horizontal Line"
                >
                  ─
                </button>
                <button
                  onClick={() => {
                    document.execCommand('justifyLeft', false, null)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="Align Left"
                >
                  ⬅
                </button>
                <button
                  onClick={() => {
                    document.execCommand('justifyCenter', false, null)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="Align Center"
                >
                  ↔
                </button>
                <button
                  onClick={() => {
                    document.execCommand('justifyRight', false, null)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="Align Right"
                >
                  ➡
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                  title="Attach File"
                >
                  <Paperclip className="h-3 w-3" />
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
              className="p-4 min-h-[250px] focus:outline-none prose prose-sm max-w-none text-gray-900"
              dangerouslySetInnerHTML={{ __html: htmlBody }}
              onInput={(e) => setHtmlBody(e.currentTarget.innerHTML)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  document.execCommand('insertParagraph', false, null)
                }
              }}
              onFocus={() => {
                // Ensure cursor is at the end when editor is focused
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
                // Ensure editor is focused when clicked
                editorRef.current?.focus()
              }}
            />
          </div>
          
          {/* Attachments Display */}
          {attachments.length > 0 && (
            <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Attachments ({attachments.length})</div>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700 p-1"
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
            <div className="border border-gray-200 rounded-lg bg-gray-50">
              <div className="p-3 border-b border-gray-200 bg-gray-100 rounded-t-lg">
                <button
                  onClick={() => setShowFullThread(!showFullThread)}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 w-full text-left"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">
                    {showFullThread ? 'Hide' : 'Show'} Email Thread ({emailThread.length} message{emailThread.length !== 1 ? 's' : ''})
                  </span>
                  <span className={`transform transition-transform ml-auto ${showFullThread ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
              </div>
              
              {showFullThread && (
                <div className="max-h-80 overflow-y-auto p-4 space-y-4">
                  {emailThread.map((threadMessage, index) => (
                    <div
                      key={threadMessage.id}
                      className={`p-4 rounded-lg border ${
                        threadMessage.id === message?.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
                        <User className="h-3 w-3" />
                        <span className="font-medium">
                          {threadMessage.from?.emailAddress?.address || threadMessage.from?.emailAddress || 'Unknown'}
                        </span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(threadMessage.receivedDateTime), { addSuffix: true })}</span>
                        {threadMessage.id === message?.id && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                            Original Message
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-800">
                        <div className="font-medium mb-2 text-gray-900">{threadMessage.subject || '(No subject)'}</div>
                        <div 
                          className="text-gray-700 prose prose-sm max-w-none leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: threadMessage.body?.content || 'No content'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
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
