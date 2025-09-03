import React, { useState } from 'react'
import { Upload } from 'lucide-react'
import { LeaseAnalysisResponse } from './LeaseAnalysisResponse'
import { LeaseDocumentParser, isLeaseDocument } from '@/lib/lease/LeaseDocumentParser'

interface Message {
  id: number
  type: 'text' | 'document_analysis' | 'error'
  content: any
  timestamp: Date
  isBot: boolean
}

interface AskAIWithLeaseAnalysisProps {
  messages: Message[]
  onSendMessage: (message: Message) => void
}

// Integration into your existing Ask AI chat interface
export const AskAIWithLeaseAnalysis: React.FC<AskAIWithLeaseAnalysisProps> = ({ 
  messages, 
  onSendMessage 
}) => {
  const [input, setInput] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [processingFile, setProcessingFile] = useState(false)

  // Handle file upload within chat context
  const handleFileUpload = async (file: File) => {
    setProcessingFile(true)
    setUploadedFile(null)

    try {
      // Clear any previous document state
      console.log(`📤 Processing ${file.name} in Ask AI context`)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('context', 'ask_ai_chat')
      formData.append('timestamp', Date.now().toString())
      formData.append('forceReprocess', 'true') // Critical: bypass cache

      const response = await fetch('/api/ask-ai/upload', {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()

      // Check if this is a lease document
      if (isLeaseDocument(file.name, result.extractedText || '')) {
        // Parse into LeaseClear format
        const parser = new LeaseDocumentParser(result.extractedText, file.name)
        const leaseAnalysis = parser.parse()

        // Add as a message in the chat
        const documentMessage: Message = {
          id: Date.now(),
          type: 'document_analysis',
          content: leaseAnalysis,
          timestamp: new Date(),
          isBot: true
        }

        onSendMessage(documentMessage)
      } else {
        // Handle as regular document
        const standardMessage: Message = {
          id: Date.now(),
          type: 'text',
          content: result.summary || 'Document analysis completed',
          timestamp: new Date(),
          isBot: true
        }
        onSendMessage(standardMessage)
      }

      setUploadedFile(file)

    } catch (error) {
      console.error('File upload error:', error)
      const errorMessage: Message = {
        id: Date.now(),
        type: 'error',
        content: `Failed to process ${file.name}: ${error}`,
        timestamp: new Date(),
        isBot: true
      }
      onSendMessage(errorMessage)
    } finally {
      setProcessingFile(false)
    }
  }

  const handleStartQA = () => {
    setInput("I'd like to ask questions about this lease document.")
  }

  const handleSendMessage = () => {
    if (input.trim()) {
      onSendMessage({
        id: Date.now(),
        type: 'text',
        content: input,
        isBot: false,
        timestamp: new Date()
      })
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-3xl ${message.isBot ? 'bg-gray-100' : 'bg-blue-500 text-white'} rounded-lg p-3`}>
              {message.type === 'document_analysis' ? (
                <LeaseAnalysisResponse 
                  leaseData={message.content} 
                  onStartQA={handleStartQA}
                />
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-3">
          {/* File Upload */}
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="chat-file-upload"
              disabled={processingFile}
            />
            <label
              htmlFor="chat-file-upload"
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                processingFile 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50 text-gray-600'
              }`}
            >
              <Upload className="h-4 w-4" />
              {processingFile ? 'Processing...' : 'Upload'}
            </label>
          </div>

          {/* Text Input */}
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask questions about your lease document..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  handleSendMessage()
                }
              }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default AskAIWithLeaseAnalysis
