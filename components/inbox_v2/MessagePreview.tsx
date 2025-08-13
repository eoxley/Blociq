"use client"

import { useState, useEffect } from 'react'
import { Reply, ReplyAll, Paperclip, Clock, User, MessageSquare, Calendar, Download } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface MessagePreviewProps {
  selectedMessage: any | null
  onReply: () => void
  onReplyAll: () => void
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

export default function MessagePreview({ selectedMessage, onReply, onReplyAll }: MessagePreviewProps) {
  const [fullMessage, setFullMessage] = useState<FullMessage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch full message content when a message is selected
  useEffect(() => {
    if (!selectedMessage?.id) {
      setFullMessage(null)
      return
    }

    const fetchFullMessage = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/outlook/v2/messages/${selectedMessage.id}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.ok && data.items?.[0]) {
            setFullMessage(data.items[0])
          } else {
            setError('Failed to load message content')
          }
        } else {
          setError('Failed to load message content')
        }
      } catch (error) {
        console.error('Error fetching message:', error)
        setError('Failed to load message content')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFullMessage()
  }, [selectedMessage?.id])

  if (!selectedMessage) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="h-8 w-8 text-[#4f46e5]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a message to preview</h3>
        <p className="text-gray-500">Choose an email from the list to view its content</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading message...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
        <p className="text-red-500 mb-2">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="text-sm text-[#4f46e5] hover:text-[#a855f7] underline"
        >
          Try again
        </button>
      </div>
    )
  }

  const receivedDate = new Date(selectedMessage.receivedDateTime)
  const message = fullMessage || selectedMessage

  const sanitizeHtml = (html: string) => {
    if (!html) return ''
    
    // Remove potentially dangerous elements and attributes
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
    
    // Clean up common email HTML issues
    sanitized = sanitized
      .replace(/<o:p[^>]*>/gi, '') // Remove Outlook paragraph tags
      .replace(/<\/o:p>/gi, '')
      .replace(/<w:[^>]*>/gi, '') // Remove Word tags
      .replace(/<\/w:[^>]*>/gi, '')
      .replace(/<m:[^>]*>/gi, '') // Remove Math tags
      .replace(/<\/m:[^>]*>/gi, '')
      .replace(/<v:[^>]*>/gi, '') // Remove Vector tags
      .replace(/<\/v:[^>]*>/gi, '')
    
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
    
    // Ensure proper paragraph spacing
    sanitized = sanitized
      .replace(/<p[^>]*>/gi, '<p class="mb-3">')
      .replace(/<br\s*\/?>/gi, '<br>')
    
    return sanitized
  }

  const formatEmailList = (recipients: any[]) => {
    if (!recipients || recipients.length === 0) return 'None'
    return recipients
      .map((r: any) => r.emailAddress?.address || r.emailAddress || r)
      .filter(Boolean)
      .join(', ')
  }

  const renderEmailBody = () => {
    if (!message.body?.content) {
      return (
        <div className="text-gray-500 italic">
          No message content available
        </div>
      )
    }

    if (message.body.contentType === 'HTML') {
      const sanitizedHtml = sanitizeHtml(message.body.content)
      return (
        <div 
          className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{ 
            __html: sanitizedHtml
          }}
        />
      )
    } else {
      // Plain text - convert line breaks to HTML
      const formattedText = message.body.content
        .replace(/\n/g, '<br>')
        .replace(/\r\n/g, '<br>')
        .replace(/\r/g, '<br>')
      
      return (
        <div 
          className="whitespace-pre-wrap text-gray-800 leading-relaxed font-mono text-sm"
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />
      )
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full"></span>
            {message.subject || '(No subject)'}
          </h3>
          <div className="flex gap-3">
            <button
              onClick={onReply}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-lg hover:brightness-110 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm transform hover:scale-105 active:scale-95"
              title="Reply to this message"
            >
              <Reply className="h-4 w-4" />
              Reply
            </button>
            <button
              onClick={onReplyAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#a855f7] to-[#4f46e5] text-white rounded-lg hover:brightness-110 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm transform hover:scale-105 active:scale-95"
              title="Reply to all recipients"
            >
              <ReplyAll className="h-4 w-4" />
              Reply All
            </button>
          </div>
        </div>
        
        {/* Message Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-[#4f46e5] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-gray-600 font-medium">From:</span>
              <span className="text-gray-800 ml-2 break-all">
                {message.from?.emailAddress?.address || message.from?.emailAddress || 'Unknown sender'}
              </span>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-[#a855f7] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-gray-600 font-medium">To:</span>
              <span className="text-gray-800 ml-2 break-all">
                {formatEmailList(message.toRecipients || [])}
              </span>
            </div>
          </div>
          
          {(message.ccRecipients || []).length > 0 && (
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-[#a855f7] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-gray-600 font-medium">CC:</span>
                <span className="text-gray-800 ml-2 break-all">
                  {formatEmailList(message.ccRecipients)}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#4f46e5]" />
            <span className="text-gray-600 font-medium">Received:</span>
            <span className="text-gray-800 ml-2">
              {format(receivedDate, 'PPP p')} ({formatDistanceToNow(receivedDate, { addSuffix: true })})
            </span>
          </div>
          
          {message.hasAttachments && (
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-[#a855f7]" />
              <span className="text-gray-600 font-medium">Attachments:</span>
              <span className="text-gray-800 ml-2">
                {message.attachments?.length || 0} file(s)
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Message Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="max-w-none">
          {renderEmailBody()}
        </div>
        
        {/* Email Chain Indicator */}
        {message.conversationId && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">
              This message is part of a conversation
            </div>
            <a
              href={message.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#4f46e5] hover:text-[#a855f7] underline"
            >
              <MessageSquare className="h-4 w-4" />
              View in Outlook
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
