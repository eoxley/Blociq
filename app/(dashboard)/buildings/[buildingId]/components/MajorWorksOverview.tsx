'use client'

import { useState } from 'react'
import { Hammer, Calendar, FileText, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface MajorWorksProject {
  id: string
  title: string
  type: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  percentage_complete: number | null
  created_at: string
}

interface TimelineEvent {
  id: string
  project_id: string
  title: string
  description: string | null
  event_date: string
  event_type: string | null
  created_at: string
}

interface MajorWorksDocument {
  id: string
  project_id: string
  document_name: string
  file_url: string | null
  uploaded_at: string
  created_at: string
}

interface MajorWorksOverviewProps {
  projects: MajorWorksProject[]
  timelineEvents: TimelineEvent[]
  documents: MajorWorksDocument[]
  buildingId: string
}

export default function MajorWorksOverview({ projects, timelineEvents, documents, buildingId }: MajorWorksOverviewProps) {
  const [selectedProject, setSelectedProject] = useState<MajorWorksProject | null>(null)

  // Get timeline events for a project
  const getTimelineEventsForProject = (projectId: string) => {
    return timelineEvents
      .filter(event => event.project_id === projectId)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
  }

  // Get documents for a project
  const getDocumentsForProject = (projectId: string) => {
    return documents.filter(doc => doc.project_id === projectId)
  }

  // Get status badge
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </span>
        )
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <TrendingUp className="h-3 w-3 mr-1" />
            In Progress
          </span>
        )
      case 'planned':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Planned
          </span>
        )
      case 'on_hold':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            On Hold
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        )
    }
  }

  // Calculate project duration
  const getProjectDuration = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="p-6">
      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hammer className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Major Works Projects</h3>
          <p className="text-gray-600">
            No major works projects have been added to this building yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const projectTimelineEvents = getTimelineEventsForProject(project.id)
            const projectDocuments = getDocumentsForProject(project.id)
            const duration = getProjectDuration(project.start_date, project.end_date)

            return (
              <div 
                key={project.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Project Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Hammer className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          {project.type && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {project.type}
                            </span>
                          )}
                          {getStatusBadge(project.status)}
                        </div>
                      </div>
                    </div>

                    {/* Project Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      {project.start_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-gray-600">Start Date</p>
                            <p className="text-gray-900 font-medium">
                              {new Date(project.start_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {project.end_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-gray-600">End Date</p>
                            <p className="text-gray-900 font-medium">
                              {new Date(project.end_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {duration && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-gray-600">Duration</p>
                            <p className="text-gray-900 font-medium">{duration} days</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {project.percentage_complete !== null && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="text-gray-900 font-medium">{project.percentage_complete}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.percentage_complete}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {projectTimelineEvents.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{projectTimelineEvents.length} timeline events</span>
                        </div>
                      )}
                      {projectDocuments.length > 0 && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{projectDocuments.length} documents</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="ml-4">
                    <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ease-in-out">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedProject.title}
                </h2>
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Project Information</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Type</p>
                        <p className="text-gray-900">{selectedProject.type || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        <div className="mt-1">{getStatusBadge(selectedProject.status)}</div>
                      </div>
                      {selectedProject.start_date && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Start Date</p>
                          <p className="text-gray-900">
                            {new Date(selectedProject.start_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {selectedProject.end_date && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">End Date</p>
                          <p className="text-gray-900">
                            {new Date(selectedProject.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedProject.percentage_complete !== null && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="text-gray-900 font-medium">{selectedProject.percentage_complete}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-teal-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${selectedProject.percentage_complete}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Events */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Timeline Events</h3>
                  
                  {getTimelineEventsForProject(selectedProject.id).length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No timeline events</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getTimelineEventsForProject(selectedProject.id).map((event) => (
                        <div key={event.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{event.title}</h4>
                              {event.description && (
                                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {new Date(event.event_date).toLocaleDateString()}
                                </span>
                                {event.event_type && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {event.event_type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Documents Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
                
                {getDocumentsForProject(selectedProject.id).length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No documents uploaded</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getDocumentsForProject(selectedProject.id).map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <a 
                            href={doc.file_url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium truncate block"
                          >
                            {doc.document_name}
                          </a>
                          <p className="text-xs text-gray-500">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                  Edit Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 