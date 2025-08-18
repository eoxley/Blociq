"use client"

import { useState, useEffect } from 'react'
import { Reply, ReplyAll, Paperclip, Clock, User, MessageSquare, Calendar, Download } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { processEmailHtml } from '@/lib/email/normalizeHtml'
import { processEmailWithInlineImages, Attachment } from '@/lib/email/inlineCid'
import { useMessageBody } from '@/lib/hooks/useMessageBody'

interface MessagePreviewProps {
  selectedMessage: any | null
  onReply: () => void
  onReplyAll: () => void
}

export default function MessagePreview({ selectedMessage, onReply, onReplyAll }: MessagePreviewProps) {
  const [processedAttachments, setProcessedAttachments] = useState<Attachment[]>([])
  
  // Use the stable hook for message body
  const { html: messageBody, loading: bodyLoading } = useMessageBody(selectedMessage?.id || null)
  
  // Process attachments when message body changes
  useEffect(() => {
    if (selectedMessage?.id && messageBody) {
      // Process HTML content for inline images if it's HTML
      if (selectedMessage.body?.contentType === 'HTML' && messageBody) {
        processEmailWithInlineImages(selectedMessage.id, messageBody)
          .then(({ attachments }) => {
            setProcessedAttachments(attachments)
          })
          .catch((error) => {
            console.warn('Failed to process inline images:', error)
            setProcessedAttachments([])
          })
      } else {
        setProcessedAttachments([])
      }
    } else {
      setProcessedAttachments([])
    }
  }, [selectedMessage?.id, messageBody])

  // Cleanup processed attachments when component unmounts or message changes
  useEffect(() => {
    return () => {
      if (processedAttachments.length > 0) {
        // Cleanup data URLs to prevent memory leaks
        processedAttachments.forEach(attachment => {
          // Note: In a real implementation, you'd want to track and revoke the created URLs
        })
      }
    }
  }, [processedAttachments])

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      // Create data URL from contentBytes
      const byteCharacters = atob(attachment.contentBytes)
      const byteNumbers = new Array(byteCharacters.length)
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: attachment.contentType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading attachment:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full shadow-sm">
      {/* Header - Fixed height, no scroll */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-gray-50 to-blue-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full"></span>
          Message Preview
        </h3>
      </div>
      
      {/* Message Content - Scrollable with remaining height */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {!selectedMessage ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Select a message to preview</p>
              <p className="text-gray-400 text-sm">Choose an email from the list to view its content</p>
            </div>
          </div>
        ) : bodyLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Loading message...</p>
            </div>
          </div>
        ) : messageBody ? (
          <div className="space-y-4">
            {/* Message Header */}
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {selectedMessage.subject || '(No subject)'}
              </h2>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#4f46e5]" />
                  <span className="font-medium">From:</span>
                  <span>{selectedMessage.from?.emailAddress?.name || selectedMessage.from?.emailAddress?.address || 'Unknown sender'}</span>
                  {selectedMessage.from?.emailAddress?.address && (
                    <span className="text-gray-400">({selectedMessage.from.emailAddress.address})</span>
                  )}
                </div>
                
                {selectedMessage.toRecipients && selectedMessage.toRecipients.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#4f46e5]" />
                    <span className="font-medium">To:</span>
                    <span>{selectedMessage.toRecipients.map((r: any) => r.emailAddress?.name || r.emailAddress?.address).join(', ')}</span>
                  </div>
                )}
                
                {selectedMessage.ccRecipients && selectedMessage.ccRecipients.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#4f46e5]" />
                    <span className="font-medium">CC:</span>
                    <span>{selectedMessage.ccRecipients.map((r: any) => r.emailAddress?.name || r.emailAddress?.address).join(', ')}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#4f46e5]" />
                  <span className="font-medium">Received:</span>
                  <span>{formatDistanceToNow(new Date(selectedMessage.receivedDateTime), { addSuffix: true })}</span>
                  <span className="text-gray-400">({format(new Date(selectedMessage.receivedDateTime), 'PPP p')})</span>
                </div>
              </div>
            </div>
            
            {/* Message Actions */}
            <div className="flex gap-2 pb-4 border-b border-gray-200">
              <button
                onClick={onReply}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-lg hover:brightness-110 transition-all duration-200 text-sm font-medium"
              >
                <Reply className="h-4 w-4" />
                Reply
              </button>
              
              <button
                onClick={onReplyAll}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:brightness-110 transition-all duration-200 text-sm font-medium"
              >
                <ReplyAll className="h-4 w-4" />
                Reply All
              </button>
              
              {selectedMessage.webLink && (
                <a
                  href={selectedMessage.webLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:brightness-110 transition-all duration-200 text-sm font-medium"
                >
                  <MessageSquare className="h-4 w-4" />
                  Open in Outlook
                </a>
              )}
            </div>
            
            {/* Message Body */}
            <div className="prose prose-sm max-w-none">
              {selectedMessage.body?.contentType === 'HTML' ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: messageBody }}
                  className="email-content"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {selectedMessage.body?.content || 'No content available'}
                </pre>
              )}
            </div>
            
            {/* Attachments */}
            {processedAttachments.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-[#a855f7]" />
                  Attachments ({processedAttachments.length})
                </h4>
                
                <div className="space-y-2">
                  {processedAttachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-[#a855f7]" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                          <p className="text-xs text-gray-500">{attachment.contentType}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => downloadAttachment(attachment)}
                        className="p-2 text-[#4f46e5] hover:text-[#a855f7] hover:bg-white rounded-md transition-colors"
                        title="Download attachment"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
