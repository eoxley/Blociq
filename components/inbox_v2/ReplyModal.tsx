"use client"

import { useEffect, useState, useRef, useMemo } from 'react'
import { Reply, ReplyAll, Paperclip, Clock, User, MessageSquare, Calendar, Download, Brain, Sparkles, Loader2, X, Send } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useTriageDraft } from '@/hooks/useTriageDraft'
import { buildReplySubject, quoteThread, composeBody, displayNameFromAddress } from '@/lib/replyUtils'

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
  const { loading, result, error, generate, reset } = useTriageDraft()
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
  const [suggestedAttachments, setSuggestedAttachments] = useState<any[]>([])
  const [attachIds, setAttachIds] = useState<string[]>([])
  
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Prepare email data for triage
  const emailData = useMemo(() => {
    if (!message) return null
    return {
      subject: message.subject || '',
      plainText: message.bodyPreview || message.body?.content || '',
      from: message.from?.emailAddress?.address || message.from?.emailAddress || '',
      to: message.toRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || [],
      cc: message.ccRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || [],
      date: message.receivedDateTime
    }
  }, [message])

  // Generate quoted thread
  const quoted = useMemo(() => {
    if (!emailData) return ''
    return quoteThread(emailData.plainText)
  }, [emailData])

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

  // Check for triage results and attachment suggestions when modal opens
  useEffect(() => {
    if (isOpen && message) {
      // Check if there are any triage results for this message
      checkTriageResults();
    }
  }, [isOpen, message]);

  const checkTriageResults = async () => {
    try {
      // Check if there's a triage result for this message
      const response = await fetch(`/api/triage/check?messageId=${message?.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.triage && data.triage.attachments_suggestions) {
          handleAttachmentSuggestions(data.triage.attachments_suggestions);
        }
      }
    } catch (error) {
      console.error('Error checking triage results:', error);
    }
  }

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
    if (!emailData) return
    
    setIsGeneratingAI(true)
    setAiGenerationError(null)
    
    try {
      const r = await generate(emailData)
      if (!r) return

      // Greet the primary correspondent if model didn't
      const draft = { ...r.draft }
      const primaryName = displayNameFromAddress(emailData.from)
      if (!draft.greeting?.trim().toLowerCase().startsWith("dear ")) {
        draft.greeting = `Dear ${primaryName}`
      }
      // Enforce our house sign-off
      draft.signoff = "Kind regards"

      // Set subject and body
      setSubject(buildReplySubject(emailData.subject))
      const fullBody = composeBody(draft, quoted)
      
      // Convert markdown to HTML for the editor
      const htmlBody = fullBody.split('\n').map(line => {
        if (line.startsWith('> ')) {
          return `<blockquote class="border-l-4 border-gray-300 pl-4 text-gray-600">${line.substring(2)}</blockquote>`
        }
        return `<p>${line}</p>`
      }).join('')
      
      setHtmlBody(htmlBody)

      // Pre-tick suggested attachments
      if (r.attachments_suggestions) {
        setSuggestedAttachments(r.attachments_suggestions)
        setAttachIds(r.attachments_suggestions.map(a => a.doc_id))
      }

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

    } catch (error) {
      console.error('Error generating AI reply:', error)
      setAiGenerationError('Error generating AI reply. Please try again.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Handle attachment suggestions from triage
  const handleAttachmentSuggestions = (suggestions: any[]) => {
    if (suggestions && suggestions.length > 0) {
      setSuggestedAttachments(suggestions);
      // Show a notification about suggested attachments
      console.log('Attachment suggestions received:', suggestions);
    }
  }

  // Add suggested attachment to the list
  const addSuggestedAttachment = (suggestion: any) => {
    // Convert suggestion to a file-like object for the attachments list
    const attachmentFile = {
      name: suggestion.title,
      size: 0,
      type: 'application/octet-stream',
      doc_id: suggestion.doc_id,
      kind: suggestion.kind,
      url: suggestion.url
    } as any;
    
    setAttachments(prev => [...prev, attachmentFile]);
    // Remove from suggestions
    setSuggestedAttachments(prev => prev.filter(s => s.doc_id !== suggestion.doc_id));
  }

  // Remove suggested attachment
  const removeSuggestedAttachment = (docId: string) => {
    setSuggestedAttachments(prev => prev.filter(s => s.doc_id !== docId));
  }

  // Toggle attachment selection
  const toggleAttachment = (doc_id: string) => {
    setAttachIds(prev => prev.includes(doc_id) ? prev.filter(x => x !== doc_id) : [...prev, doc_id]);
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
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-auto md:w-[800px] lg:w-[900px] rounded-xl bg-white shadow-2xl max-h-[90vh] flex flex-col z-[10000] border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* AI Triage Results */}
          {result && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800 mb-2">
                <div className="font-medium mb-2">🤖 AI Triage Results:</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Priority {result.priority}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {result.category}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {result.label}
                  </span>
                </div>
                {result.required_actions && result.required_actions.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium">Required actions:</span> {result.required_actions.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Generation Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 shadow-sm">
              <span className="font-medium">AI Generation Error:</span> {error}
            </div>
          )}

          {/* Compact Email Info */}
          {message && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">From:</span>
                    <span className="text-gray-900">{message.from?.emailAddress?.address || message.from?.emailAddress || 'Unknown'}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">Subject:</span>
                    <span className="text-gray-900">{message.subject || '(No subject)'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Compact Recipients Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="space-y-3">
              {/* To Recipients - Compact */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-12">To:</label>
                <div className="flex-1 flex flex-wrap gap-2">
                  {toRecipients.map((email, index) => (
                    <span key={index} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200">
                      {email}
                      <button
                        onClick={() => removeRecipient('to', index)}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => addRecipient('to')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>
              
              {/* CC Recipients - Compact */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-12">CC:</label>
                <div className="flex-1 flex flex-wrap gap-2">
                  {ccRecipients.map((email, index) => (
                    <span key={index} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 text-sm rounded-lg border border-gray-200">
                      {email}
                      <button
                        onClick={() => removeRecipient('cc', index)}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => addRecipient('cc')}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>
              
              {/* BCC Recipients - Compact */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-12">BCC:</label>
                <div className="flex-1 flex flex-wrap gap-2">
                  {bccRecipients.map((email, index) => (
                    <span key={index} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 text-sm rounded-lg border border-gray-200">
                      {email}
                      <button
                        onClick={() => removeRecipient('bcc', index)}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => addRecipient('bcc')}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Compact AI Reply Generation Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerateAIReply}
              disabled={isGeneratingAI || loading}
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4338ca] hover:to-[#9333ea] text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingAI || loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Brain className="h-5 w-5" />
              )}
              <span className="text-sm">
                {isGeneratingAI || loading ? 'Generating AI Reply...' : 'Generate AI Reply'}
              </span>
            </button>
          </div>
          
          {/* Context Information */}
          {message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-2">📧 Email Context:</div>
                <div className="space-y-1 text-xs">
                  <div><span className="font-medium">From:</span> {message.from?.emailAddress?.address || message.from?.emailAddress || 'Unknown'}</div>
                  <div><span className="font-medium">Subject:</span> {message.subject || '(No subject)'}</div>
                  <div><span className="font-medium">Type:</span> {replyType === 'reply' ? 'Reply' : 'Reply All'}</div>
                  <div className="text-blue-600 mt-2">
                    💡 AI will analyse this email and generate a contextual, professional reply
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
          
          {/* Compact Editor */}
          <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 p-2 bg-gray-50">
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => {
                    document.execCommand('bold', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors font-bold"
                  title="Bold"
                >
                  B
                </button>
                <button
                  onClick={() => {
                    document.execCommand('italic', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors italic"
                  title="Italic"
                >
                  I
                </button>
                <button
                  onClick={() => {
                    document.execCommand('underline', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors underline"
                  title="Underline"
                >
                  U
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button
                  onClick={() => {
                    document.execCommand('insertUnorderedList', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="Bullet List"
                >
                  •
                </button>
                <button
                  onClick={() => {
                    document.execCommand('insertOrderedList', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="Numbered List"
                >
                  1.
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
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
              className="p-4 min-h-[250px] focus:outline-none prose prose-sm max-w-none text-gray-900 leading-relaxed"
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
          
          {/* Compact Attachments Display */}
          {attachments.length > 0 && (
            <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({attachments.length})
              </div>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                      title="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* AI Suggested Attachments */}
          {suggestedAttachments.length > 0 && (
            <div className="border border-blue-200 rounded-lg bg-blue-50 p-3">
              <div className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Suggested Attachments ({suggestedAttachments.length})
              </div>
              <div className="text-xs text-blue-600 mb-3">
                💡 AI has identified relevant documents that could be attached to this reply
              </div>
              <div className="space-y-2">
                {suggestedAttachments.map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-blue-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{suggestion.title}</div>
                        <div className="text-xs text-gray-500 capitalize">{suggestion.kind.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => addSuggestedAttachment(suggestion)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        title="Add to attachments"
                      >
                        + Add
                      </button>
                      <button
                        onClick={() => removeSuggestedAttachment(suggestion.doc_id)}
                        className="text-gray-500 hover:text-gray-700 text-xs font-medium hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                        title="Dismiss suggestion"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Compact Email Thread Display */}
          {emailThread.length > 0 && (
            <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
              <div className="p-3 border-b border-gray-200 bg-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span>
                    Email Thread ({emailThread.length} message{emailThread.length !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto p-3 space-y-3">
                {emailThread.map((threadMessage, index) => (
                  <div
                    key={threadMessage.id || index}
                    className={`p-3 rounded border text-sm ${
                      threadMessage.id === message?.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs">
                        {threadMessage.from?.emailAddress?.address || threadMessage.from?.emailAddress || 'Unknown'}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(threadMessage.receivedDateTime).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-medium mb-1">
                      {threadMessage.subject || '(No subject)'}
                    </div>
                    <div
                      className="text-gray-800 whitespace-pre-wrap text-xs leading-relaxed max-h-20 overflow-hidden"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(threadMessage.body?.content || '(No content)')
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
        
        {/* Compact Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleGenerateAIReply}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors font-medium"
          >
            <Brain className="h-4 w-4" />
            {isGeneratingAI || loading ? 'Generating...' : 'Generate with Ask BlocIQ'}
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !htmlBody.trim()}
              className="flex items-center gap-2 px-6 py-2 text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 rounded transition-colors font-medium"
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
