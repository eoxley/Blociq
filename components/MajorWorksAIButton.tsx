'use client'

import React, { useState } from 'react'
import { Bot, Loader2, X } from 'lucide-react'

interface MajorWorksAIButtonProps {
  projectId?: string
  projectTitle?: string
  buildingId?: string
  onAskAI: (question: string) => Promise<string>
}

export default function MajorWorksAIButton({ 
  projectId, 
  projectTitle, 
  buildingId, 
  onAskAI 
}: MajorWorksAIButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    try {
      const response = await onAskAI(question)
      setAnswer(response)
    } catch (error) {
      setAnswer('Sorry, I encountered an error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const quickQuestions = [
    'Summarise this project',
    'What is the current status?',
    'What are the next steps?',
    'Are there any delays?',
    'What documents are missing?',
    'When will works commence?'
  ]

  const handleQuickQuestion = (quickQuestion: string) => {
    setQuestion(quickQuestion)
  }

  return (
    <>
      {/* AI Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
      >
        <Bot className="h-4 w-4" />
        Ask AI
      </button>

      {/* AI Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">AI Assistant</h2>
                <p className="text-sm text-gray-600">
                  Ask questions about {projectTitle ? `"${projectTitle}"` : 'this project'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setQuestion('')
                  setAnswer('')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Quick Questions */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Questions:</h3>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((q, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(q)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Input */}
              <form onSubmit={handleAskAI} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Question
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Ask about the project status, timeline, documents, or any other aspect..."
                    disabled={loading}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4" />
                        Ask AI
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestion('')
                      setAnswer('')
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </form>

              {/* AI Response */}
              {answer && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">AI Response:</h3>
                  <div className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                    {answer}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
} 