"use client"

import { Reply, ReplyAll, Paperclip, Clock, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface MessagePreviewProps {
  selectedMessage: any | null
  onReply: () => void
  onReplyAll: () => void
}

export default function MessagePreview({ selectedMessage, onReply, onReplyAll }: MessagePreviewProps) {
  if (!selectedMessage) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Select a message to preview</p>
      </div>
    )
  }

  const receivedDate = new Date(selectedMessage.receivedDateTime)
  
  // Simple HTML sanitization - in production, use a proper library like DOMPurify
  const sanitizeHtml = (html: string) => {
    if (!html) return ''
    // Remove script tags and other potentially dangerous elements
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedMessage.subject || '(No subject)'}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={onReply}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Reply"
            >
              <Reply className="h-4 w-4" />
            </button>
            <button
              onClick={onReplyAll}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Reply All"
            >
              <ReplyAll className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              From: {selectedMessage.from?.emailAddress?.address || 'Unknown sender'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {formatDistanceToNow(receivedDate, { addSuffix: true })}
            </span>
          </div>
          
          {selectedMessage.hasAttachments && (
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Has attachments</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {selectedMessage.bodyPreview ? (
          <div className="prose prose-sm max-w-none">
            <div 
              className="text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: sanitizeHtml(selectedMessage.bodyPreview) 
              }}
            />
          </div>
        ) : (
          <p className="text-gray-500">No message content to display</p>
        )}
      </div>
    </div>
  )
}
