'use client'

import React from 'react'
import { AlertTriangle, CheckCircle, Clock, FileText, Wrench } from 'lucide-react'

interface TimelineProps {
  startDate: string | null
  estimatesIssued: string | null
  constructionStart: string | null
  completionDate: string | null
  status: string
}

export default function MajorWorksTimeline({
  startDate,
  estimatesIssued,
  constructionStart,
  completionDate,
  status
}: TimelineProps) {
  if (!startDate) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No start date set
      </div>
    )
  }

  const start = new Date(startDate)
  const today = new Date()
  const eighteenMonthsLater = new Date(start)
  eighteenMonthsLater.setMonth(eighteenMonthsLater.getMonth() + 18)

  // Calculate current position (months from start)
  const monthsFromStart = Math.max(0, (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  const currentPosition = Math.min(18, monthsFromStart)

  // Calculate milestone positions
  const getMilestonePosition = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const monthsFromStart = Math.max(0, (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    return Math.min(18, monthsFromStart)
  }

  const estimatesPosition = getMilestonePosition(estimatesIssued)
  const constructionPosition = getMilestonePosition(constructionStart)
  const completionPosition = getMilestonePosition(completionDate)

  // Check for flags
  const isOver6MonthsNoConstruction = monthsFromStart >= 6 && !constructionStart
  const isOver18MonthsNotCompleted = monthsFromStart >= 18 && status !== 'completed'

  return (
    <div className="space-y-3">
      {/* Timeline Bar */}
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          {/* Progress bar showing current position */}
          <div 
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${(currentPosition / 18) * 100}%` }}
          />
          
          {/* Current position indicator */}
          <div 
            className="absolute top-0 w-3 h-3 bg-teal-600 rounded-full border-2 border-white shadow-md transform -translate-y-0.5 transition-all duration-300"
            style={{ left: `${(currentPosition / 18) * 100}%` }}
          />
        </div>

        {/* Month markers */}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          {Array.from({ length: 19 }, (_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-1 h-1 bg-gray-300 rounded-full mb-1" />
              {i % 6 === 0 && <span>{i}</span>}
            </div>
          ))}
        </div>

        {/* Milestone markers */}
        <div className="relative -mt-8">
          {/* Notice Issued (start date) */}
          <div className="absolute transform -translate-x-1/2" style={{ left: '0%' }}>
            <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-md" />
            <div className="text-xs text-blue-600 font-medium mt-1">Notice</div>
          </div>

          {/* Estimates Issued */}
          {estimatesPosition !== null && (
            <div className="absolute transform -translate-x-1/2" style={{ left: `${(estimatesPosition / 18) * 100}%` }}>
              <div className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-white shadow-md" />
              <div className="text-xs text-yellow-600 font-medium mt-1">Estimates</div>
            </div>
          )}

          {/* Construction Start */}
          {constructionPosition !== null && (
            <div className="absolute transform -translate-x-1/2" style={{ left: `${(constructionPosition / 18) * 100}%` }}>
              <div className="w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-md" />
              <div className="text-xs text-orange-600 font-medium mt-1">Works Start</div>
            </div>
          )}

          {/* Completion */}
          {completionPosition !== null && (
            <div className="absolute transform -translate-x-1/2" style={{ left: `${(completionPosition / 18) * 100}%` }}>
              <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-md" />
              <div className="text-xs text-green-600 font-medium mt-1">Complete</div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline labels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span>Notice Issued</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <span>Estimates</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-orange-500 rounded-full" />
          <span>Works Start</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>Completion</span>
        </div>
      </div>

      {/* Warning flags */}
      {(isOver6MonthsNoConstruction || isOver18MonthsNotCompleted) && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            {isOver18MonthsNotCompleted ? (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">⚠️ 18+ months passed - Section 20 consultation period exceeded</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">⚠️ 6+ months passed with no construction start</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Timeline info */}
      <div className="text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-teal-500 rounded-full" />
          <span>Current position: {Math.round(currentPosition)} months from start</span>
        </div>
        <div className="mt-1">
          <span>Timeline: {start.toLocaleDateString('en-GB')} → {eighteenMonthsLater.toLocaleDateString('en-GB')}</span>
        </div>
      </div>
    </div>
  )
} 