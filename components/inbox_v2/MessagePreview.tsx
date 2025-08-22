"use client"

import { useState, useEffect } from 'react'
import { Reply, ReplyAll, Forward, Paperclip, Clock, User, MessageSquare, Calendar, Download, Eye, EyeOff, Star, Flag, MoreVertical, Trash2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// Function to detect if content looks like HTML
function looksLikeHtml(content: string): boolean {
  if (!content) return false;
  return /<[^>]*>/g.test(content);
}

// Function to sanitize and enhance HTML email content
function sanitizeEmailHtml(html: string): string {
  if (!html) return '';
  
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    return html; // Return original HTML if not in browser
  }
  
  try {
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Ensure images are properly sized and responsive
    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
      const imgElement = img as HTMLImageElement;
      imgElement.style.maxWidth = '100%';
      imgElement.style.height = 'auto';
      imgElement.style.borderRadius = '4px';
      imgElement.style.margin = '8px 0';
    });
    
    // Ensure tables are responsive
    const tables = tempDiv.querySelectorAll('table');
    tables.forEach(table => {
      const tableElement = table as HTMLTableElement;
      tableElement.style.maxWidth = '100%';
      tableElement.style.borderCollapse = 'collapse';
      tableElement.style.margin = '8px 0';
    });
    
    // Ensure links are properly styled
    const links = tempDiv.querySelectorAll('a');
    links.forEach(link => {
      const linkElement = link as HTMLAnchorElement;
      linkElement.style.color = '#2563eb';
      linkElement.style.textDecoration = 'underline';
      linkElement.target = '_blank';
      linkElement.rel = 'noopener noreferrer';
    });
    
    // Ensure proper spacing for common elements
    const paragraphs = tempDiv.querySelectorAll('p');
    paragraphs.forEach(p => {
      const pElement = p as HTMLParagraphElement;
      pElement.style.margin = '8px 0';
      pElement.style.lineHeight = '1.6';
    });
    
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(h => {
      const hElement = h as HTMLHeadingElement;
      hElement.style.margin = '16px 0 8px 0';
      hElement.style.fontWeight = '600';
    });
    
    const lists = tempDiv.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const listElement = list as HTMLUListElement | HTMLOListElement;
      listElement.style.margin = '8px 0';
      listElement.style.paddingLeft = '20px';
    });
    
    const listItems = tempDiv.querySelectorAll('li');
    listItems.forEach(li => {
      const liElement = li as HTMLLIElement;
      liElement.style.margin = '4px 0';
    });
    
    return tempDiv.innerHTML;
  } catch (error) {
    console.warn('Error sanitizing email HTML:', error);
    return html; // Return original HTML if sanitization fails
  }
}

interface MessagePreviewProps {
  selectedMessage: any | null
  onReply: () => void
  onReplyAll: () => void
  onMessageUpdate?: () => void
  triageResult?: any
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
  isRead?: boolean
}

export default function MessagePreview({ selectedMessage, onReply, onReplyAll, onMessageUpdate, triageResult }: MessagePreviewProps) {
  const [fullMessage, setFullMessage] = useState<FullMessage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMarkingRead, setIsMarkingRead] = useState(false)

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

  const markMessageAsRead = async (isRead: boolean) => {
    if (!selectedMessage?.id) return
    
    setIsMarkingRead(true)
    try {
      const response = await fetch('/api/outlook/v2/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId: selectedMessage.id, isRead })
      })
      
      if (response.ok) {
        // Update local state
        setFullMessage(prev => prev ? { ...prev, isRead } : null)
        // Notify parent component to refresh
        if (onMessageUpdate) {
          onMessageUpdate()
        }
      } else {
        console.error('Failed to mark message as read')
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
    } finally {
      setIsMarkingRead(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedMessage?.id || !confirm('Are you sure you want to delete this message?')) return
    
    try {
      const response = await fetch(`/api/outlook/v2/messages/${selectedMessage.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Notify parent component to refresh
        if (onMessageUpdate) {
          onMessageUpdate()
        }
      } else {
        console.error('Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  if (!selectedMessage) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading message...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading message</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const message = fullMessage || selectedMessage
  const receivedDate = new Date(message.receivedDateTime || message.createdDateTime || Date.now())

  return (
    <div className="flex flex-col h-full">
      {/* Message Header */}
      <div className="border-b border-gray-200 p-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
              {message.subject || 'No Subject'}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{message.from?.emailAddress?.name || message.from?.emailAddress?.address || 'Unknown Sender'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatDistanceToNow(new Date(message.receivedDateTime), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-4">
            <button 
              onClick={() => markMessageAsRead(!message.isRead)}
              disabled={isMarkingRead}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={message.isRead ? 'Mark as unread' : 'Mark as read'}
            >
              {message.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Star message">
              <Star className="h-4 w-4" />
            </button>
            
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Flag message">
              <Flag className="h-4 w-4" />
            </button>
            
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="More options">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Recipients */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">To:</span>
            <div className="mt-1">
              {message.toRecipients?.map((recipient: any, index: number) => (
                <div key={index} className="text-gray-600">
                  {recipient.emailAddress?.name || recipient.emailAddress?.address}
                </div>
              )) || 'No recipients'}
            </div>
          </div>
          
          {message.ccRecipients && message.ccRecipients.length > 0 && (
            <div>
              <span className="font-medium text-gray-700">CC:</span>
              <div className="mt-1">
                {message.ccRecipients.map((recipient: any, index: number) => (
                  <div key={index} className="text-gray-600">
                    {recipient.emailAddress?.name || recipient.emailAddress?.address}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Actions */}
      <div className="border-b border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onReply}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] transition-colors font-medium"
          >
            <Reply className="h-4 w-4" />
            Reply
          </button>
          
          <button
            onClick={onReplyAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <ReplyAll className="h-4 w-4" />
            Reply All
          </button>
          
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            <Forward className="h-4 w-4" />
            Forward
          </button>
          
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Attachments */}
        {message.hasAttachments && message.attachments && message.attachments.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 mx-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments ({message.attachments.length})
            </h4>
            <div className="space-y-2">
              {message.attachments.map((attachment: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Paperclip className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                      <p className="text-xs text-gray-500">
                        {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Body */}
        <div className="px-4 pb-4">
          {message.body?.content ? (
            looksLikeHtml(message.body.content) ? (
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeEmailHtml(message.body.content) 
                }} 
                className="email-content text-gray-900 leading-relaxed"
              />
            ) : (
              <div className="email-content text-gray-900 leading-relaxed whitespace-pre-wrap">
                {message.body.content}
              </div>
            )
          ) : (
            <p className="text-gray-500 italic">No message content available</p>
          )}
        </div>

        {/* AI Triage Result */}
        {triageResult && (
          <div className="mx-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Triage Result
            </h4>
            <div className="text-sm text-blue-800">
              <p><strong>Category:</strong> {triageResult.category}</p>
              {triageResult.summary && (
                <p className="mt-2"><strong>Summary:</strong> {triageResult.summary}</p>
              )}
              {triageResult.suggestedActions && triageResult.suggestedActions.length > 0 && (
                <div className="mt-2">
                  <strong>Suggested Actions:</strong>
                  <ul className="list-disc list-inside mt-1 ml-2">
                    {triageResult.suggestedActions.map((action: string, index: number) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
