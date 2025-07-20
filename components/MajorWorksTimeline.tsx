'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, FileText, CheckCircle, Construction, AlertCircle } from 'lucide-react'

interface TimelineEvent {
  id: string
  title: string
  notes?: string
  created_by: string
  timestamp: string
}

interface Project {
  id: string
  title: string
  start_date: string
  estimates_issued: string
  funds_confirmed?: string
  contractor_appointed?: string
  construction_start: string
  completion_date: string
  status: string
  consultation_stage: string
}

interface MajorWorksTimelineProps {
  project: Project
  logs: TimelineEvent[]
}

export default function MajorWorksTimeline({ project, logs }: MajorWorksTimelineProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLogTitle, setNewLogTitle] = useState('')
  const [newLogNotes, setNewLogNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLogTitle.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/major-works-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: project.id,
          title: newLogTitle.trim(),
          notes: newLogNotes.trim(),
          created_by: 'Property Manager'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add log')
      }

      // Refresh the page to show the new log
      window.location.reload()
    } catch (error) {
      console.error('Failed to add log:', error)
      alert('Failed to add log. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate timeline dates
  const startDate = new Date(project.start_date)
  const timelineStart = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days before
  const timelineEnd = new Date(startDate.getTime() + 18 * 30 * 24 * 60 * 60 * 1000) // 18 months after

  // Key milestones for Section 20 process
  const milestones = [
    {
      id: 'notice',
      title: 'Notice of Intention',
      date: project.start_date,
      icon: FileText,
      color: 'bg-blue-500',
      completed: true,
      description: '30 days consultation period begins'
    },
    {
      id: 'estimates',
      title: 'Statement of Estimates',
      date: project.estimates_issued,
      icon: AlertCircle,
      color: 'bg-yellow-500',
      completed: !!project.estimates_issued,
      description: '30 days consultation on estimates'
    },
    {
      id: 'funds',
      title: 'Confirmation of Funds',
      date: project.funds_confirmed,
      icon: CheckCircle,
      color: 'bg-purple-500',
      completed: !!project.funds_confirmed,
      description: 'Leaseholder funds confirmed'
    },
    {
      id: 'contractor',
      title: 'Contractor Appointment',
      date: project.contractor_appointed,
      icon: Construction,
      color: 'bg-orange-500',
      completed: !!project.contractor_appointed,
      description: 'Contractor selected and appointed'
    },
    {
      id: 'construction',
      title: 'Works Commence',
      date: project.construction_start,
      icon: Construction,
      color: 'bg-indigo-500',
      completed: !!project.construction_start,
      description: 'Construction work begins'
    },
    {
      id: 'completion',
      title: 'Completion',
      date: project.completion_date,
      icon: CheckCircle,
      color: 'bg-green-500',
      completed: project.status === 'completed',
      description: 'Project completed'
    }
  ]

  // Combine milestones and logs
  const allEvents = [
    ...milestones.filter(milestone => milestone.date).map(milestone => ({
      ...milestone,
      type: 'milestone' as const,
      timestamp: milestone.date!
    })),
    ...logs.map(log => ({
      ...log,
      type: 'log' as const,
      icon: Calendar,
      color: 'bg-gray-500'
    }))
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Timeline & Observations</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Add Log
        </button>
      </div>

      {/* Add Log Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                value={newLogTitle}
                onChange={(e) => setNewLogTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              >
                <option value="">Select an action type...</option>
                <option value="Surveyor Appointed">Surveyor Appointed</option>
                <option value="Leaseholder Meeting">Leaseholder Meeting</option>
                <option value="Consultation Feedback">Consultation Feedback</option>
                <option value="Document Uploaded">Document Uploaded</option>
                <option value="Contractor Quote Received">Contractor Quote Received</option>
                <option value="Planning Permission">Planning Permission</option>
                <option value="Building Regulations">Building Regulations</option>
                <option value="Insurance Updated">Insurance Updated</option>
                <option value="Site Visit">Site Visit</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Details
              </label>
              <textarea
                value={newLogNotes}
                onChange={(e) => setNewLogNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Add details about this action, meeting minutes, or observations..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Action'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        {/* Events */}
        <div className="space-y-6">
          {allEvents.map((event, index) => {
            const Icon = event.icon
            const isMilestone = event.type === 'milestone'
            
            return (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${event.color} flex items-center justify-center text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
                
                {/* Event content */}
                <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                     <div className="flex items-start justify-between mb-2">
                     <div className="flex-1">
                       <h4 className="text-sm font-semibold text-gray-900">
                         {event.title}
                       </h4>
                       {isMilestone && event.description && (
                         <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                       )}
                     </div>
                     {isMilestone && (
                       <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                         event.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                       }`}>
                         {event.completed ? 'Completed' : 'Pending'}
                       </span>
                     )}
                   </div>
                  
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(event.timestamp).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  
                  {event.type === 'log' && event.notes && (
                    <p className="text-sm text-gray-600">{event.notes}</p>
                  )}
                  
                  {event.type === 'log' && (
                    <p className="text-xs text-gray-400 mt-2">
                      Logged by: {event.created_by}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* No events message */}
      {allEvents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No timeline events yet. Add the first log to get started.</p>
        </div>
      )}
    </div>
  )
} 