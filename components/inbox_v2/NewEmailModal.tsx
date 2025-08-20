"use client"

import { useEffect, useState, useRef } from 'react'
import { Reply, ReplyAll, Paperclip, Clock, User, MessageSquare, Calendar, Download, Brain, Sparkles, Loader2, X, Send } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface NewEmailModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Attachment {
  id: string
  name: string
  size: number
  type: string
}

interface UserSignature {
  signature: string
  signatureText: string
  signatureImage: string | null
  emailSignature: string
  fullName: string
  jobTitle: string
  email: string
}

export default function NewEmailModal({ isOpen, onClose }: NewEmailModalProps) {
  const [htmlBody, setHtmlBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showBlocIQNote, setShowBlocIQNote] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [subject, setSubject] = useState('')
  const [toRecipients, setToRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  const [bccRecipients, setBccRecipients] = useState<string[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showBcc, setShowBcc] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [userSignature, setUserSignature] = useState<UserSignature | null>(null)
  
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load user signature when modal opens
  useEffect(() => {
    const loadSignature = async () => {
      try {
        const response = await fetch('/api/get-signature')
        if (response.ok) {
          const data = await response.json()
          setUserSignature(data)
        }
      } catch (error) {
        console.error('Error loading signature:', error)
      }
    }

    if (isOpen) {
      loadSignature()
    }
  }, [isOpen])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Initialize body with signature if available
      let initialBody = '<p><br></p>'
      
      // Add signature if available
      if (userSignature) {
        let signatureHtml = ''
        
        // Add signature image if available
        if (userSignature.signatureImage) {
          signatureHtml += `<br><br><img src="${userSignature.signatureImage}" alt="Signature" style="max-height: 60px; max-width: 200px;" />`
        }
        
        // Add text signature and email signature template
        if (userSignature.signatureText || userSignature.emailSignature) {
          signatureHtml += '<br><br>'
          
          if (userSignature.signatureText) {
            signatureHtml += `<div class="signature-font">${userSignature.signatureText}</div>`
          }
          
          if (userSignature.emailSignature) {
            signatureHtml += `<div style="font-family: Arial, sans-serif; font-size: 12px; color: #666; margin-top: 8px;">${userSignature.emailSignature}</div>`
          }
        }
        
        // If no custom signature, add default
        if (!signatureHtml) {
          signatureHtml = `<br><br><div style="font-family: Arial, sans-serif; font-size: 12px; color: #666;">
            Best regards,<br>
            <strong>${userSignature.fullName}</strong>${userSignature.jobTitle ? `<br>${userSignature.jobTitle}` : ''}
          </div>`
        }
        
        initialBody += signatureHtml
      }
      
      setHtmlBody(initialBody)
      setSubject('')
      setToRecipients([])
      setCcRecipients([])
      setBccRecipients([])
      setAttachments([])
      setShowBcc(false)
      setIsDraft(false)
    }
  }, [isOpen, userSignature])

  // Handle body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
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
    if (!htmlBody.trim() || toRecipients.length === 0) return
    
    setIsSending(true)
    setSendError(null)
    setSendSuccess(false)
    
    try {
      const response = await fetch('/api/outlook/v2/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: toRecipients.filter(Boolean),
          cc: ccRecipients.filter(Boolean),
          bcc: bccRecipients.filter(Boolean),
          subject: subject.trim(),
          htmlBody: htmlBody.trim(),
          attachments: attachments
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.ok) {
        setSendSuccess(true)
        console.log('Email sent successfully:', data.messageId)
        
        // Show success message briefly before closing
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        const errorMessage = data?.error || 'Failed to send email'
        setSendError(errorMessage)
        console.error('Failed to send email:', errorMessage)
      }
    } catch (error) {
      const errorMessage = 'Network error while sending email'
      setSendError(errorMessage)
      console.error('Error sending email:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!htmlBody.trim()) return
    
    setIsDraft(true)
    try {
      const response = await fetch('/api/outlook/v2/messages/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: toRecipients.filter(Boolean),
          cc: ccRecipients.filter(Boolean),
          bcc: bccRecipients.filter(Boolean),
          subject: subject.trim(),
          htmlBody: htmlBody.trim(),
          attachments: attachments
        })
      })
      
      if (response.ok) {
        onClose()
        // You could add a success toast here
      } else {
        console.error('Failed to save draft')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setIsDraft(false)
    }
  }

  const handleGenerateWithBlocIQ = () => {
    setShowBlocIQNote(true)
    setTimeout(() => setShowBlocIQNote(false), 3000)
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

  const addRecipient = (type: 'to' | 'cc' | 'bcc') => {
    const newEmail = prompt(`Enter ${type.toUpperCase()} email address:`)
    if (newEmail && newEmail.trim()) {
      switch (type) {
        case 'to':
          setToRecipients([...toRecipients, newEmail.trim()])
          break
        case 'cc':
          setCcRecipients([...ccRecipients, newEmail.trim()])
          break
        case 'bcc':
          setBccRecipients([...bccRecipients, newEmail.trim()])
          break
      }
    }
  }

  const removeRecipient = (type: 'to' | 'cc' | 'bcc', index: number) => {
    switch (type) {
      case 'to':
        setToRecipients(toRecipients.filter((_, i) => i !== index))
        break
      case 'cc':
        setCcRecipients(ccRecipients.filter((_, i) => i !== index))
        break
      case 'bcc':
        setBccRecipients(bccRecipients.filter((_, i) => i !== index))
        break
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newAttachments: Attachment[] = Array.from(files).map((file, index) => ({
        id: `file-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type
      }))
      setAttachments([...attachments, ...newAttachments])
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (attachmentId: string) => {
    setAttachments(attachments.filter(att => att.id !== attachmentId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const hasValidRecipients = () => {
    return toRecipients.length > 0 && toRecipients.every(isValidEmail)
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
              <h2 className="text-2xl font-bold text-gray-900">New Email</h2>
              <p className="text-sm text-gray-600 font-medium">Compose a new message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Email Form - Scrollable Content */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* Recipients and Subject */}
          <div className="p-6 border-b border-gray-200 space-y-5 flex-shrink-0">
            {/* To */}
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
            
            {/* CC */}
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
            
            {/* BCC */}
            <div className="flex items-start gap-4">
              <div className="w-20 flex items-center gap-3">
                <button
                  onClick={() => setShowBcc(!showBcc)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline hover:bg-gray-50 px-3 py-2 rounded-lg transition-all duration-200 font-medium"
                >
                  {showBcc ? 'Hide' : 'Show'} BCC
                </button>
              </div>
              {showBcc && (
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
              )}
            </div>
            
            {/* Subject */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 w-20">Subject:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm focus:shadow-md transition-all duration-200"
                placeholder="Enter subject line"
              />
            </div>
          </div>
          
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 flex-shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments:
                </span>
                {attachments.map((attachment) => (
                  <span key={attachment.id} className="inline-flex items-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-sm shadow-md">
                    <Paperclip className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{attachment.name}</span>
                    <span className="text-gray-500">({formatFileSize(attachment.size)})</span>
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full p-1.5 transition-all duration-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Editor Toolbar */}
          <div className="border-b border-gray-300 p-4 bg-gradient-to-r from-gray-50 to-blue-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => {
                    document.execCommand('bold', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-bold shadow-sm hover:shadow-md"
                  title="Bold"
                >
                  B
                </button>
                <button
                  onClick={() => {
                    document.execCommand('italic', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 italic shadow-sm hover:shadow-md"
                  title="Italic"
                >
                  I
                </button>
                <button
                  onClick={() => {
                    document.execCommand('underline', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 underline shadow-sm hover:shadow-md"
                  title="Underline"
                >
                  U
                </button>
                <button
                  onClick={() => {
                    document.execCommand('insertUnorderedList', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Bullet List"
                >
                  •
                </button>
                <button
                  onClick={() => {
                    document.execCommand('insertOrderedList', false, undefined)
                    editorRef.current?.focus()
                  }}
                  className="px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Numbered List"
                >
                  1.
                </button>
                <div className="w-px h-8 bg-gray-300 mx-2"></div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
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
          </div>
          
          {/* Editor - Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Success/Error Messages */}
            {sendSuccess && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl m-4 shadow-sm">
                <p className="text-green-800 text-sm font-medium">
                  ✅ Email sent successfully! Closing in a moment...
                </p>
              </div>
            )}
            
            {sendError && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl m-4 shadow-sm">
                <p className="text-red-800 text-sm font-medium">
                  ❌ {sendError}
                </p>
              </div>
            )}
            
            <div
              ref={editorRef}
              contentEditable
              className="p-6 focus:outline-none prose prose-lg max-w-none text-gray-900 min-h-[300px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlBody) }}
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
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-b-3xl flex-shrink-0">
          <div className="flex gap-4">
            <button
              onClick={handleGenerateWithBlocIQ}
              className="flex items-center gap-3 px-6 py-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Brain className="h-5 w-5" />
              Generate with Ask BlocIQ
            </button>
            
            <button
              onClick={handleSaveDraft}
              disabled={isDraft || !htmlBody.trim()}
              className="px-6 py-3 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50"
            >
              Save Draft
            </button>
          </div>
          
          {showBlocIQNote && (
            <div className="absolute bottom-20 left-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl text-sm text-blue-800 max-w-xs shadow-lg">
              <Brain className="h-4 w-4 inline mr-2 text-blue-600" />
              Ask BlocIQ integration coming soon! This will allow AI-powered email drafting.
            </div>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-8 py-3 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !htmlBody.trim() || !hasValidRecipients()}
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
