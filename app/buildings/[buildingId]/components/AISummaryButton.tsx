'use client'

import { useState } from 'react'
import { Brain, Loader2, Sparkles } from 'lucide-react'

interface AISummaryButtonProps {
  buildingId: string
  buildingName: string
}

export default function AISummaryButton({ buildingId, buildingName }: AISummaryButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const generateSummary = async () => {
    setIsLoading(true)
    setShowModal(true)

    try {
      const response = await fetch('/api/generate-building-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId,
          buildingName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data.summary)
    } catch (error) {
      console.error('Error generating summary:', error)
      setSummary('Sorry, there was an error generating the building summary. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={generateSummary}
        disabled={isLoading}
        className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Brain className="h-5 w-5" />
        )}
        {isLoading ? 'Generating Summary...' : 'Summarise this Building'}
        <Sparkles className="h-4 w-4" />
      </button>

      {/* Summary Modal */}
      {showModal && (
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
                      AI Building Summary
                    </h2>
                    <p className="text-sm text-gray-600">{buildingName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowModal(false)
                    setSummary(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Generating Summary
                    </h3>
                    <p className="text-gray-600">
                      AI is analyzing building data and generating a comprehensive summary...
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

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Summary Includes:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Recent activity and compliance status</li>
                        <li>• Overdue items and upcoming deadlines</li>
                        <li>• Major works progress and timeline</li>
                        <li>• Recent leaseholder issues and communications</li>
                        <li>• Key metrics and performance indicators</li>
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setShowModal(false)
                    setSummary(null)
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
                {summary && (
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Export Summary
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