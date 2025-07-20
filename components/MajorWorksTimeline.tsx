"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  UserCheck,
  Hammer,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarPlus } from "lucide-react";

interface Project {
  id: string
  title: string
  start_date: string
  estimates_issued: string
  construction_start: string
  completion_date: string
  status: string
  consultation_stage: string
}

interface TimelineEvent {
  id: string
  title: string
  notes?: string
  created_by: string
  timestamp: string
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

  // Calculate Section 20 timeline stages based on project dates
  const startDate = project.start_date ? new Date(project.start_date) : new Date()
  const estimatesDate = project.estimates_issued ? new Date(project.estimates_issued) : null
  const constructionDate = project.construction_start ? new Date(project.construction_start) : null
  const completionDate = project.completion_date ? new Date(project.completion_date) : null

  // Calculate estimated dates if not provided
  const observationCloseDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days after NOI
  const estimatesCloseDate = estimatesDate ? new Date(estimatesDate.getTime() + 30 * 24 * 60 * 60 * 1000) : new Date(observationCloseDate.getTime() + 14 * 24 * 60 * 60 * 1000)
  const contractorAppointmentDate = estimatesDate ? new Date(estimatesDate.getTime() + 45 * 24 * 60 * 60 * 1000) : new Date(estimatesCloseDate.getTime() + 15 * 24 * 60 * 60 * 1000)
  const worksStartDate = constructionDate || new Date(contractorAppointmentDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  const worksCompleteDate = completionDate || new Date(worksStartDate.getTime() + 90 * 24 * 60 * 60 * 1000) // 3 months estimate

  const timelineStages = [
    {
      title: "Notice of Intention Issued",
      date: startDate,
      icon: ClipboardList,
      status: "Completed",
      description: "Section 20 consultation begins"
    },
    {
      title: "Observation Period Closes",
      date: observationCloseDate,
      icon: AlertTriangle,
      status: new Date() > observationCloseDate ? "Completed" : "Pending",
      description: "30-day consultation period ends"
    },
    {
      title: "Statement of Estimates Issued",
      date: estimatesDate || new Date(observationCloseDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      icon: FileText,
      status: estimatesDate ? "Completed" : "Pending",
      description: "Contractor estimates provided to leaseholders"
    },
    {
      title: "Estimates Observation Closes",
      date: estimatesCloseDate,
      icon: AlertTriangle,
      status: new Date() > estimatesCloseDate ? "Completed" : "Pending",
      description: "30-day estimates consultation period ends"
    },
    {
      title: "Contractor Appointed",
      date: contractorAppointmentDate,
      icon: UserCheck,
      status: project.status === 'ongoing' || project.status === 'completed' ? "Completed" : "Pending",
      description: "Contractor selected and appointed"
    },
    {
      title: "Works Commence",
      date: worksStartDate,
      icon: Hammer,
      status: constructionDate ? "Completed" : (project.status === 'completed' ? "Completed" : "Pending"),
      description: "Physical works begin on site"
    },
    {
      title: "Works Complete",
      date: worksCompleteDate,
      icon: CheckCircle,
      status: project.status === 'completed' ? "Completed" : "Pending",
      description: "All works completed and signed off"
    },
  ];

  // Combine timeline stages with custom logs
  const allEvents = [
    ...timelineStages.map((stage, index) => ({
      ...stage,
      type: 'milestone' as const,
      id: `milestone-${index}`,
      isMilestone: true,
      timestamp: stage.date.toISOString()
    })),
    ...logs.map(log => ({
      ...log,
      type: 'log' as const,
      icon: CalendarPlus,
      status: 'Completed',
      description: log.notes,
      isMilestone: false,
      date: new Date(log.timestamp)
    }))
  ].sort((a, b) => new Date(a.date || a.timestamp).getTime() - new Date(b.date || b.timestamp).getTime())

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Section 20 Timeline & Observations</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <CalendarPlus className="w-4 h-4 mr-2" /> Add Log
        </Button>
      </div>

      {/* Add Log Form */}
      {showAddForm && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Log Title
                </label>
                <input
                  type="text"
                  value={newLogTitle}
                  onChange={(e) => setNewLogTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., Consultation feedback received"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Add any additional details..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {isSubmitting ? 'Adding...' : 'Add Log'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="border-l-2 border-gray-200 pl-4 space-y-6">
        {allEvents.map((event, i) => {
          const Icon = event.icon
          const eventDate = event.date || event.timestamp
          
          return (
            <div key={event.id} className="flex items-start space-x-4">
              <div className="mt-1">
                <Icon className="w-6 h-6 text-teal-600" />
              </div>
              <Card className="flex-1">
                <CardContent className="py-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm md:text-base">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {event.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(eventDate), "d MMMM yyyy @ HH:mm")}
                      </p>
                                             {!event.isMilestone && 'created_by' in event && (
                         <p className="text-xs text-gray-400 mt-1">
                           Logged by: {event.created_by}
                         </p>
                       )}
                    </div>
                                         <Badge 
                       variant={event.status === "Completed" ? "default" : "outline"}
                       className={event.status === "Completed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                     >
                      {event.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* No events message */}
      {allEvents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <CalendarPlus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No timeline events yet. Add the first log to get started.</p>
        </div>
      )}
    </div>
  );
} 