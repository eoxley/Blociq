'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, FileText, CheckCircle, Construction, AlertCircle, AlertTriangle } from 'lucide-react'

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
  notice_of_reason_issued?: string
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
      id: 'notice_of_reason',
      title: 'Notice of Reason',
      date: project.notice_of_reason_issued,
      icon: AlertTriangle,
      color: 'bg-red-500',
      completed: !!project.notice_of_reason_issued,
      description: 'Issued if leaseholders object (if applicable)'
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
    <div className="space-y-8">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">Section 20 Timeline</h3>
              <p className="text-teal-100 text-sm">Track major works progress and compliance milestones</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm px-4 py-2 rounded-xl transition-all duration-300"
            >
              <Calendar className="h-4 w-4 mr-2 inline" />
              Add Log
            </button>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-16 h-16 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 bg-white/5 rounded-full"></div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-blue-700">
                {milestones.filter(m => m.completed).length}/{milestones.length}
              </div>
              <div className="text-sm text-blue-600">Milestones Complete</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-green-700">
                {logs.length}
              </div>
              <div className="text-sm text-green-600">Activity Logs</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-purple-700">
                {allEvents.length}
              </div>
              <div className="text-sm text-purple-600">Total Events</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Log Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Add Timeline Event</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <select
                value={newLogTitle}
                onChange={(e) => setNewLogTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
                required
              >
                <option value="">Select an action type...</option>
                <option value="Notice of Reason Issued">Notice of Reason Issued</option>
                <option value="Surveyor Appointed">Surveyor Appointed</option>
                <option value="Leaseholder Meeting">Leaseholder Meeting</option>
                <option value="Consultation Feedback">Consultation Feedback</option>
                <option value="Leaseholder Objection">Leaseholder Objection</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Details
              </label>
              <textarea
                value={newLogNotes}
                onChange={(e) => setNewLogNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
                placeholder="Add details about this action, meeting minutes, or observations..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-300 disabled:opacity-50 shadow-lg"
              >
                {isSubmitting ? 'Adding...' : 'Add Action'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-6">Timeline & Observations</h4>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 to-blue-500 rounded-full"></div>
          
          {/* Events */}
          <div className="space-y-6">
            {allEvents.map((event, index) => {
              const Icon = event.icon
              const isMilestone = event.type === 'milestone'
              
              return (
                <div key={event.id} className="relative flex items-start gap-4 group">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${event.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  {/* Event content */}
                  <div className="flex-1 min-w-0 bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-lg transition-all duration-300 group-hover:border-teal-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {event.title}
                        </h4>
                        {isMilestone && event.description && (
                          <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                        )}
                      </div>
                      {isMilestone && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          event.completed ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600'
                        }`}>
                          {event.completed ? '✅ Completed' : '⏳ Pending'}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-3 font-medium">
                      {new Date(event.timestamp).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    
                    {event.type === 'log' && event.notes && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{event.notes}</p>
                    )}
                    
                    {event.type === 'log' && (
                      <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
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
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Timeline Events</h4>
            <p className="text-gray-500 mb-4">Add the first log to start tracking your project progress.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-300 shadow-lg"
            >
              <Calendar className="h-4 w-4 mr-2 inline" />
              Add First Event
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 