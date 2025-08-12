"use client"

import { useEffect, useState } from 'react'
import { X, Send, Brain, Loader2 } from 'lucide-react'

interface ReplyModalProps {
  isOpen: boolean
  onClose: () => void
  message: any | null
  replyType: 'reply' | 'replyAll'
}

export default function ReplyModal({ isOpen, onClose, message, replyType }: ReplyModalProps) {
  const [htmlBody, setHtmlBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showBlocIQNote, setShowBlocIQNote] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Set initial reply content
      if (message) {
        const subject = message.subject || '(No subject)'
        const prefix = subject.startsWith('Re:') ? '' : 'Re: '
        setHtmlBody(`<p><br></p><p>${prefix}${subject}</p><p><br></p>`)
      }
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, message])

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
          htmlBody: htmlBody.trim()
        })
      })
      
      if (response.ok) {
        onClose()
      } else {
        console.error('Failed to send reply')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleGenerateWithBlocIQ = () => {
    setShowBlocIQNote(true)
    // Hide note after 3 seconds
    setTimeout(() => setShowBlocIQNote(false), 3000)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[840px] rounded-2xl bg-white shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {replyType === 'reply' ? 'Reply' : 'Reply All'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[70vh] overscroll-contain p-4 space-y-4">
          {message && (
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>To:</strong> {message.from?.emailAddress?.address}</p>
              <p><strong>Subject:</strong> {message.subject || '(No subject)'}</p>
            </div>
          )}
          
          {/* Editor */}
          <div className="border border-gray-300 rounded-lg">
            <div className="border-b border-gray-300 p-2 bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => setHtmlBody(htmlBody + '<strong>Bold</strong>')}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  B
                </button>
                <button
                  onClick={() => setHtmlBody(htmlBody + '<em>Italic</em>')}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  I
                </button>
                <button
                  onClick={() => setHtmlBody(htmlBody + '<br>')}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  ↵
                </button>
              </div>
            </div>
            <div
              contentEditable
              className="p-3 min-h-[200px] focus:outline-none prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlBody }}
              onInput={(e) => setHtmlBody(e.currentTarget.innerHTML)}
            />
          </div>
          
          {/* BlocIQ Note */}
          {showBlocIQNote && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <Brain className="h-4 w-4 inline mr-2" />
              Ask BlocIQ integration coming soon! This will allow AI-powered email drafting.
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <button
            onClick={handleGenerateWithBlocIQ}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Brain className="h-4 w-4" />
            Generate with Ask BlocIQ
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !htmlBody.trim()}
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
