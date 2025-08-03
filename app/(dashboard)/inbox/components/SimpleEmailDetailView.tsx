'use client'

import React, { useState } from 'react'
import { Brain, MessageSquare, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

type Email = {
  id: string
  from_email: string | null
  from_name: string | null
  subject: string | null
  body_preview: string | null
  body_full: string | null
  received_at: string | null
  unread: boolean | null
  handled: boolean | null
  pinned: boolean | null
  flag_status: string | null
  categories: string[] | null
  building_id: number | null
  unit_id: number | null
  leaseholder_id: string | null
  buildings?: { name: string } | null
  units?: { unit_number: string } | null
  leaseholders?: { name: string; email: string } | null
}

interface SimpleEmailDetailViewProps {
  email: Email
}

export default function SimpleEmailDetailView({ email }: SimpleEmailDetailViewProps) {
  const [isSummarising, setIsSummarising] = useState(false)
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [reply, setReply] = useState<string | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [showReplyModal, setShowReplyModal] = useState(false)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const generateSummary = async () => {
    setIsSummarising(true)
    setShowSummaryModal(true)

    try {
      const response = await fetch('/api/summarise-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: email.id,
          subject: email.subject,
          body: email.body_full || email.body_preview,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data.summary)
    } catch (error) {
      console.error('Error generating summary:', error)
      setSummary('Sorry, there was an error generating the summary. Please try again.')
    } finally {
      setIsSummarising(false)
    }
  }

  const generateReply = async () => {
    setIsGeneratingReply(true)
    setShowReplyModal(true)

    try {
      const response = await fetch('/api/generate-email-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: email.id,
          subject: email.subject,
          body: email.body_full || email.body_preview,
          from: email.from_name || email.from_email,
          mode: 'reply'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate reply')
      }

      const data = await response.json()
      setReply(data.draft)
    } catch (error) {
      console.error('Error generating reply:', error)
      setReply('Sorry, there was an error generating the reply. Please try again.')
    } finally {
      setIsGeneratingReply(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Email Header */}
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {email.subject || 'No subject'}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="font-medium">
              From: {email.from_name || email.from_email || 'Unknown sender'}
            </span>
            <span>•</span>
            <span>{formatDate(email.received_at)}</span>
            {email.unread && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-medium">Unread</span>
              </>
            )}
          </div>
        </div>

        {/* AI Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={generateSummary}
            disabled={isSummarising}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
          >
            {isSummarising ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            {isSummarising ? 'Summarising...' : 'AI Summarise'}
            <Sparkles className="h-3 w-3" />
          </button>

          <button
            onClick={generateReply}
            disabled={isGeneratingReply}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
          >
            {isGeneratingReply ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {isGeneratingReply ? 'Generating...' : 'Generate Reply'}
            <Sparkles className="h-3 w-3" />
          </button>
        </div>

        {/* Email Body */}
        <div className="prose max-w-none">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Email Content</h3>
            <div className="text-gray-700 whitespace-pre-wrap">
              {email.body_full || email.body_preview || 'No content available'}
            </div>
          </div>
        </div>

        {/* Email Metadata */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold mb-3">Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Status:</span>
              <span className="ml-2">
                {email.handled ? 'Handled' : 'Pending'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Flagged:</span>
              <span className="ml-2">
                {email.flag_status === 'flagged' ? 'Yes' : 'No'}
              </span>
            </div>
            {email.categories && email.categories.length > 0 && (
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Categories:</span>
                <div className="flex gap-2 mt-1">
                  {email.categories.map((category, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {email.buildings?.name && (
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Building:</span>
                <span className="ml-2">{email.buildings.name}</span>
              </div>
            )}
            {email.units?.unit_number && (
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Unit:</span>
                <span className="ml-2">{email.units.unit_number}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      AI Email Summary
                    </h2>
                    <p className="text-sm text-gray-600">{email.subject}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowSummaryModal(false)
                    setSummary(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {isSummarising ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Generating Summary
                    </h3>
                    <p className="text-gray-600">
                      AI is analyzing the email content and generating a concise summary...
                    </p>
                  </div>
                ) : summary ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">AI Summary</h3>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                          {summary}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                <button 
                  onClick={() => {
                    setShowSummaryModal(false)
                    setSummary(null)
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      AI Generated Reply
                    </h2>
                    <p className="text-sm text-gray-600">Reply to: {email.from_name || email.from_email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowReplyModal(false)
                    setReply(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {isGeneratingReply ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Generating Reply
                    </h3>
                    <p className="text-gray-600">
                      AI is crafting a professional response to this email...
                    </p>
                  </div>
                ) : reply ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-gray-900">AI Generated Reply</h3>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                          {reply}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setShowReplyModal(false)
                    setReply(null)
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
                {reply && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Use This Reply
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 