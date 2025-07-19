'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CreateMajorWorksModal from '@/components/CreateMajorWorksModal'
import MajorWorksTimeline from '@/components/MajorWorksTimeline'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Calendar, Wrench, CheckCircle } from 'lucide-react'

interface Building {
  name: string
  address: string | null
}

interface Project {
  id: number
  title: string
  status: string
  start_date: string | null
  estimates_issued: string | null
  construction_start: string | null
  completion_date: string | null
  buildings: Building
}

interface MajorWorksClientProps {
  ongoingProjects: Project[]
  completedProjects: Project[]
  onProjectCreated: (newProject: Project) => void
}

export default function MajorWorksClient({
  ongoingProjects,
  completedProjects,
  onProjectCreated
}: MajorWorksClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Helper function to format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Helper function to get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'warning'
      case 'planning':
        return 'info'
      case 'consulting':
        return 'info'
      case 'awaiting_contractor':
        return 'warning'
      case 'on_hold':
        return 'outline'
      default:
        return 'default'
    }
  }

  const handleProjectCreated = (newProject: Project) => {
    onProjectCreated(newProject)
  }

  return (
    <>
      {/* Ongoing Projects Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wrench className="h-6 w-6 text-teal-600" />
          <h2 className="text-xl font-semibold text-gray-900">🟡 Ongoing Projects</h2>
        </div>
        {ongoingProjects.length > 0 ? (
          <div className="grid gap-4">
            {ongoingProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {project.buildings?.name || 'Unknown Building'}
                        </span>
                      </div>
                      <Badge variant={getStatusBadgeVariant(project.status)}>
                        {project.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Timeline Section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Section 20 Timeline (18 months)</h4>
                    <MajorWorksTimeline
                      startDate={project.start_date}
                      estimatesIssued={project.estimates_issued}
                      constructionStart={project.construction_start}
                      completionDate={project.completion_date}
                      status={project.status}
                    />
                  </div>

                  {/* Date Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>Start Date</span>
                      </div>
                      <span className="font-medium">{formatDate(project.start_date)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>Estimates</span>
                      </div>
                      <span className="font-medium">{formatDate(project.estimates_issued)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>Construction</span>
                      </div>
                      <span className="font-medium">{formatDate(project.construction_start)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>Completion</span>
                      </div>
                      <span className="font-medium">{formatDate(project.completion_date)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No ongoing projects</p>
            <p className="text-sm text-gray-400">Start a new project to begin tracking major works</p>
          </div>
        )}
      </div>

      {/* Completed Projects Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">✅ Completed Projects</h2>
        </div>
        {completedProjects.length > 0 ? (
          <div className="grid gap-4">
            {completedProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {project.buildings?.name || 'Unknown Building'}
                        </span>
                      </div>
                      <Badge variant={getStatusBadgeVariant(project.status)}>
                        {project.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Timeline Section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Section 20 Timeline (18 months)</h4>
                    <MajorWorksTimeline
                      startDate={project.start_date}
                      estimatesIssued={project.estimates_issued}
                      constructionStart={project.construction_start}
                      completionDate={project.completion_date}
                      status={project.status}
                    />
                  </div>

                  {/* Date Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>Start Date</span>
                      </div>
                      <span className="font-medium">{formatDate(project.start_date)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>Estimates</span>
                      </div>
                      <span className="font-medium">{formatDate(project.estimates_issued)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>Construction</span>
                      </div>
                      <span className="font-medium">{formatDate(project.construction_start)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>Completion</span>
                      </div>
                      <span className="font-medium">{formatDate(project.completion_date)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No completed projects</p>
            <p className="text-sm text-gray-400">Completed projects will appear here</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white rounded-full p-4 shadow-lg transition-colors duration-200 group"
        >
          <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </Button>
      </div>

      {/* Create Project Modal */}
      <CreateMajorWorksModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </>
  )
} 