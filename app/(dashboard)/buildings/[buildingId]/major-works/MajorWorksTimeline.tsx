'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  FileText, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Camera,
  Building,
  Wrench,
  DollarSign,
  Percent
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'

interface MajorWorksTimelineProps {
  buildingId: string
  buildingName: string
}

interface Project {
  id: string
  title: string
  description: string
  status: string
  consultation_stage: string
  section20_notice_issued: string
  estimated_start_date: string
  actual_start_date: string
  estimated_completion_date: string
  actual_completion_date: string
  estimated_cost: number
  actual_cost: number
  completion_percentage: number
  priority: string
  project_type: string
  contractor_name: string
  contractor_email: string
  contractor_phone: string
  is_active: boolean
  created_at: string
  updated_at: string
  statistics: {
    total_documents: number
    total_logs: number
    total_observations: number
    days_since_start: number | null
    days_until_completion: number | null
  }
  project_health: string
  latest_activity: any
  documents?: any[]
  logs?: any[]
  observations?: any[]
}

export default function MajorWorksTimeline({ buildingId, buildingName }: MajorWorksTimelineProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [buildingId])

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/major-works/building/${buildingId}?include_documents=true&include_logs=true&include_observations=true`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ongoing': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'overdue': return 'text-red-600'
      case 'urgent': return 'text-orange-600'
      case 'delayed': return 'text-yellow-600'
      case 'good': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.contractor_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-2 text-gray-600">Loading major works projects...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Major Works Timeline</h2>
          <p className="text-gray-600">{buildingName}</p>
        </div>
        <Link href={`/buildings/${buildingId}/major-works/new`}>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'planned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('planned')}
          >
            Planned
          </Button>
          <Button
            variant={filterStatus === 'ongoing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('ongoing')}
          >
            Ongoing
          </Button>
          <Button
            variant={filterStatus === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('completed')}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Projects Timeline */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first major works project'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Link href={`/buildings/${buildingId}/major-works/new`}>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Project
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                        {project.status}
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(project.priority)}`}>
                        {project.priority} priority
                      </Badge>
                      {project.project_health !== 'good' && (
                        <AlertCircle className={`h-4 w-4 ${getHealthColor(project.project_health)}`} />
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{project.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleProjectExpansion(project.id)}
                  >
                    {expandedProject === project.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Project Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Percent className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium">{project.completion_percentage}%</p>
                      <p className="text-xs text-gray-500">Complete</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">£{(project.estimated_cost / 1000).toFixed(0)}k</p>
                      <p className="text-xs text-gray-500">Estimated</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">
                        {project.estimated_completion_date 
                          ? format(new Date(project.estimated_completion_date), 'MMM dd')
                          : 'TBD'
                        }
                      </p>
                      <p className="text-xs text-gray-500">Due Date</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <User className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">{project.contractor_name}</p>
                      <p className="text-xs text-gray-500">Contractor</p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{project.completion_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.completion_percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedProject === project.id && (
                  <div className="border-t pt-4 space-y-4">
                    {/* Documents */}
                    {project.documents && project.documents.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documents ({project.documents.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {project.documents.map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.title}</p>
                                <p className="text-xs text-gray-500">
                                  {doc.document_type} • {formatFileSize(doc.file_size)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-3 w-3" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={doc.file_url} download>
                                    <Download className="h-3 w-3" />
                                  </a>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Logs */}
                    {project.logs && project.logs.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Recent Activity ({project.logs.length})
                        </h4>
                        <div className="space-y-2">
                          {project.logs.slice(0, 5).map((log: any) => (
                            <div key={log.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded border">
                              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{log.action}</p>
                                <p className="text-xs text-gray-600">{log.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Link href={`/buildings/${buildingId}/major-works/${project.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/buildings/${buildingId}/major-works/${project.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/buildings/${buildingId}/major-works/${project.id}/upload`}>
                        <Button variant="outline" size="sm">
                          <Upload className="h-3 w-3 mr-1" />
                          Upload Document
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 