'use client'

import React, { useState, useEffect } from 'react'
import { Wand2, Send, Copy, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface EmailContext {
  subject: string
  sender?: string
  senderName?: string
  body: string
  id: string
  importance?: number
}

interface GenerateReplyModalProps {
  isOpen: boolean
  onClose: () => void
  autoTrigger?: boolean
}

const GenerateReplyModal: React.FC<GenerateReplyModalProps> = ({ isOpen, onClose, autoTrigger = false }) => {
  const [currentEmail, setCurrentEmail] = useState<EmailContext | null>(null)
  const [generatedReply, setGeneratedReply] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [replyStyle, setReplyStyle] = useState('professional')
  const [customInstructions, setCustomInstructions] = useState('')
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null)

  useEffect(() => {
    if (isOpen) {
      getCurrentEmailAndGenerate()
    }
  }, [isOpen, autoTrigger])

  const getCurrentEmailAndGenerate = async () => {
    try {
      if (typeof Office !== 'undefined' && Office.context && Office.context.mailbox && Office.context.mailbox.item) {
        const item = Office.context.mailbox.item
        
        item.body.getAsync(Office.CoercionType.Text, (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            const emailData: EmailContext = {
              subject: item.subject || 'No Subject',
              sender: item.sender?.emailAddress || 'Unknown',
              senderName: item.sender?.displayName || 'Unknown Sender',
              body: result.value || '',
              id: item.itemId || 'unknown',
              importance: item.importance || 0
            }
            
            setCurrentEmail(emailData)
            
            // Auto-generate if triggered from Reply button
            if (autoTrigger) {
              generateReply(emailData)
            }
          } else {
            console.error('Failed to get email body:', result.error)
            setStatus({ type: 'error', message: 'Could not read email content' })
          }
        })
      } else {
        // For development/testing without Office context
        console.log('Office context not available - development mode')
        const mockEmail: EmailContext = {
          subject: 'Test Email Subject',
          sender: 'test@example.com',
          senderName: 'Test Sender',
          body: 'This is a test email body for development purposes.',
          id: 'test-id'
        }
        setCurrentEmail(mockEmail)
      }
    } catch (error) {
      console.error('Error getting email context:', error)
      setStatus({ type: 'error', message: 'Failed to read email content' })
    }
  }

  const generateReply = async (emailData: EmailContext = currentEmail) => {
    if (!emailData) {
      setStatus({ type: 'error', message: 'No email data available' })
      return
    }

    setIsGenerating(true)
    setStatus(null)

    try {
      // Build comprehensive prompt for reply generation
      const replyPrompt = `Generate a ${replyStyle} email reply to this email:

FROM: ${emailData.senderName} (${emailData.sender})
SUBJECT: ${emailData.subject}
CONTENT: ${emailData.body}

REPLY STYLE: ${replyStyle}
${customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

Please generate a contextually appropriate, ${replyStyle} email response. Include:
1. Appropriate greeting addressing ${emailData.senderName}
2. Acknowledgment of their email/concern
3. Professional response to their query/request
4. Appropriate closing and signature

Format as a complete email ready to send.`

      const response = await fetch('/api/ask-ai-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: replyPrompt,
          is_public: false,
          context: 'email_reply_generation'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate reply: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && (data.response || data.result)) {
        const reply = data.response || data.result
        setGeneratedReply(reply)
        setStatus({ type: 'success', message: 'Reply generated successfully!' })
      } else {
        throw new Error(data.error || 'No reply generated')
      }

    } catch (error) {
      console.error('Error generating reply:', error)
      setStatus({ 
        type: 'error', 
        message: `Failed to generate reply: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const saveToDrafts = async () => {
    if (!generatedReply || !currentEmail) {
      setStatus({ type: 'error', message: 'No reply to save' })
      return
    }

    try {
      if (typeof Office !== 'undefined' && Office.context && Office.context.mailbox && Office.context.mailbox.item) {
        // Create reply draft in Outlook
        Office.context.mailbox.item.displayReplyForm({
          htmlBody: generatedReply.replace(/\n/g, '<br>'),
          attachments: []
        })

        setStatus({ type: 'success', message: 'Draft created in Outlook!' })
        setTimeout(() => onClose(), 1500)
      } else {
        // Fallback for development - copy to clipboard
        await navigator.clipboard.writeText(generatedReply)
        setStatus({ type: 'success', message: 'Reply copied to clipboard (dev mode)!' })
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      setStatus({ type: 'error', message: 'Failed to create draft' })
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedReply)
      setStatus({ type: 'success', message: 'Copied to clipboard!' })
      setTimeout(() => setStatus(null), 2000)
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to copy to clipboard' })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Wand2 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Reply Assistant</h2>
              <p className="text-sm text-gray-600">Generate contextual email response</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 text-2xl p-1 rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Email Context */}
          {currentEmail && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Replying to:</h3>
              <p className="text-sm text-gray-700"><strong>From:</strong> {currentEmail.senderName} ({currentEmail.sender})</p>
              <p className="text-sm text-gray-700"><strong>Subject:</strong> {currentEmail.subject}</p>
              <div className="mt-2 text-sm text-gray-600 max-h-24 overflow-y-auto">
                {currentEmail.body.substring(0, 300)}...
              </div>
            </div>
          )}

          {/* Reply Style */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Reply Style</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'professional', label: 'Professional', desc: 'Formal business tone' },
                { value: 'friendly', label: 'Friendly', desc: 'Warm but professional' },
                { value: 'concise', label: 'Concise', desc: 'Brief and direct' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setReplyStyle(option.value)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    replyStyle === option.value 
                      ? 'border-blue-500 bg-blue-50 text-blue-900' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., 'Schedule a viewing', 'Include maintenance policy', 'Escalate to urgent'..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={() => generateReply()}
            disabled={isGenerating || !currentEmail}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Reply...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Reply
              </>
            )}
          </button>

          {/* Generated Reply Display */}
          {generatedReply && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Generated Reply</h3>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={() => generateReply()}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                  {generatedReply}
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={saveToDrafts}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Save as Draft in Outlook
                </button>
                
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {status && (
            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
              status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
              'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-sm">{status.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GenerateReplyModal