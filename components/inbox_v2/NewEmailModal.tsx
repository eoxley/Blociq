"use client"

import { useEffect, useState, useRef } from 'react'
import { X, Send, Brain, Loader2, Paperclip, Bold, Italic, List, Link, Quote, Trash2, Plus, MessageSquare } from 'lucide-react'

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

export default function NewEmailModal({ isOpen, onClose }: NewEmailModalProps) {
  const [htmlBody, setHtmlBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showBlocIQNote, setShowBlocIQNote] = useState(false)
  const [subject, setSubject] = useState('')
  const [toRecipients, setToRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  const [bccRecipients, setBccRecipients] = useState<string[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showBcc, setShowBcc] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setHtmlBody('<p><br></p>')
      setSubject('')
      setToRecipients([])
      setCcRecipients([])
      setBccRecipients([])
      setAttachments([])
      setShowBcc(false)
      setIsDraft(false)
    }
  }, [isOpen])

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
    if (!htmlBody.trim() || toRecipients.length === 0) return
    
    setIsSending(true)
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
      
      if (response.ok) {
        onClose()
        // You could add a success toast here
      } else {
        console.error('Failed to send email')
        // You could add an error toast here
      }
    } catch (error) {
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
        className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Panel */}
      <div className="fixed inset-x-4 top-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-auto md:w-[900px] lg:w-[1000px] rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">New Email</h2>
          </div>
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
            
            {/* BCC */}
            <div className="flex items-center gap-2">
              <div className="w-12 flex items-center gap-2">
                <button
                  onClick={() => setShowBcc(!showBcc)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  {showBcc ? 'Hide' : 'Show'} BCC
                </button>
              </div>
              {showBcc && (
                <div className="flex-1 flex flex-wrap gap-2">
                  {bccRecipients.map((email, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-md">
                      {email}
                      <button
                        onClick={() => removeRecipient('bcc', index)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => addRecipient('bcc')}
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    + Add
                  </button>
                </div>
              )}
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
          
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Attachments:</span>
                {attachments.map((attachment) => (
                  <span key={attachment.id} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded-md text-sm">
                    <Paperclip className="h-3 w-3 text-gray-500" />
                    {attachment.name} ({formatFileSize(attachment.size)})
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-gray-500 hover:text-red-600 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Editor Toolbar */}
          <div className="border-b border-gray-300 p-2 bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => document.execCommand('bold', false)}
                  className="toolbar-button"
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  onClick={() => document.execCommand('italic', false)}
                  className="toolbar-button"
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  onClick={() => document.execCommand('insertUnorderedList', false)}
                  className="toolbar-button"
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => document.execCommand('createLink', false)}
                  className="toolbar-button"
                  title="Insert Link"
                >
                  <Link className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setHtmlBody(htmlBody + '<blockquote>Quote</blockquote>')}
                  className="toolbar-button"
                  title="Quote"
                >
                  <Quote className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="toolbar-button"
                  title="Attach File"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>
          
          {/* Editor */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div
              ref={editorRef}
              contentEditable
              className="flex-1 p-4 focus:outline-none prose prose-sm max-w-none overflow-y-auto content-editor"
              dangerouslySetInnerHTML={{ __html: htmlBody }}
              onInput={(e) => setHtmlBody(e.currentTarget.innerHTML)}
              style={{ minHeight: '200px' }}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleGenerateWithBlocIQ}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Brain className="h-4 w-4" />
              Generate with Ask BlocIQ
            </button>
            
            <button
              onClick={handleSaveDraft}
              disabled={isDraft || !htmlBody.trim()}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>
          </div>
          
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
              disabled={isSending || !htmlBody.trim() || !hasValidRecipients()}
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
