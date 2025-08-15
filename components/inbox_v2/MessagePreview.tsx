"use client"

import { useState, useEffect } from 'react'
import { Reply, ReplyAll, Paperclip, Clock, User, MessageSquare, Calendar, Download } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { processEmailHtml } from '@/lib/email/normalizeHtml'
import { processEmailWithInlineImages, Attachment } from '@/lib/email/inlineCid'

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
  const [processedAttachments, setProcessedAttachments] = useState<Attachment[]>([])

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
            const message = data.items[0]
            
            // Process HTML content for inline images if it's HTML
            if (message.body?.contentType === 'HTML' && message.body?.content) {
              try {
                const { processedHtml, attachments } = await processEmailWithInlineImages(
                  message.id,
                  message.body.content
                )
                
                // Update message with processed HTML
                const processedMessage = {
                  ...message,
                  body: {
                    ...message.body,
                    content: processedHtml
                  }
                }
                
                setFullMessage(processedMessage)
                setProcessedAttachments(attachments)
              } catch (processError) {
                console.warn('Failed to process inline images, using original content:', processError)
                setFullMessage(message)
                setProcessedAttachments([])
              }
            } else {
              setFullMessage(message)
              setProcessedAttachments([])
            }
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
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setError('Failed to download attachment');
    }
  };

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
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Loading message...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-500 text-lg mb-2">⚠️</div>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        ) : fullMessage ? (
          <div className="space-y-4">
            {/* Message Header */}
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {fullMessage.subject || '(No subject)'}
              </h2>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#4f46e5]" />
                  <span className="font-medium">From:</span>
                  <span>{fullMessage.from?.emailAddress?.name || fullMessage.from?.emailAddress?.address || 'Unknown sender'}</span>
                  {fullMessage.from?.emailAddress?.address && (
                    <span className="text-gray-400">({fullMessage.from.emailAddress.address})</span>
                  )}
                </div>
                
                {fullMessage.toRecipients && fullMessage.toRecipients.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#4f46e5]" />
                    <span className="font-medium">To:</span>
                    <span>{fullMessage.toRecipients.map((r: any) => r.emailAddress?.name || r.emailAddress?.address).join(', ')}</span>
                  </div>
                )}
                
                {fullMessage.ccRecipients && fullMessage.ccRecipients.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#4f46e5]" />
                    <span className="font-medium">CC:</span>
                    <span>{fullMessage.ccRecipients.map((r: any) => r.emailAddress?.name || r.emailAddress?.address).join(', ')}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#4f46e5]" />
                  <span className="font-medium">Received:</span>
                  <span>{formatDistanceToNow(new Date(fullMessage.receivedDateTime), { addSuffix: true })}</span>
                  <span className="text-gray-400">({format(new Date(fullMessage.receivedDateTime), 'PPP p')})</span>
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
              
              {fullMessage.webLink && (
                <a
                  href={fullMessage.webLink}
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
              {fullMessage.body?.contentType === 'HTML' ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: fullMessage.body.content }}
                  className="email-content"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {fullMessage.body?.content || 'No content available'}
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
                          <p className="text-sm font-medium text-gray-900">{attachment.filename}</p>
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
