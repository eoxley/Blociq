'use client'

import { useState } from 'react'
import { X, AlertTriangle, Clock, CheckCircle, MessageSquare } from 'lucide-react'

interface TriageButtonProps {
  className?: string
}

export default function TriageButton({ className = "" }: TriageButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const triageOptions = [
    { id: 'urgent', label: 'Mark as Urgent', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
    { id: 'follow-up', label: 'Follow Up Later', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { id: 'resolved', label: 'Mark as Resolved', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 'archive', label: 'Archive', icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  ]

  const handleTriage = (optionId: string) => {
    console.log(`Triage action: ${optionId}`)
    // TODO: Implement actual triage logic
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-red-400 transition-colors shadow-sm ${className}`}
        title="AI Triage - Coming Soon"
      >
        <AlertTriangle className="h-4 w-4 text-red-600" />
        Triage
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">AI Triage Options</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {triageOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.id}
                    onClick={() => handleTriage(option.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${option.bgColor} hover:brightness-95`}
                  >
                    <Icon className={`h-5 w-5 ${option.color}`} />
                    <span className={`font-medium ${option.color}`}>{option.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                AI-powered triage coming soon. This will automatically categorize and prioritize your emails.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
