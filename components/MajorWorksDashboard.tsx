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
  Percent,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  CalendarDays,
  Users,
  FileCheck,
  AlertTriangle,
  Construction
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format, differenceInDays } from 'date-fns'

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
  building_id: string
  buildings?: {
    id: string
    name: string
    address: string
  }
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

interface MajorWorksDashboardProps {
  showAllBuildings?: boolean
  limit?: number
  showAddButton?: boolean
}

export default function MajorWorksDashboard({ 
  showAllBuildings = true, 
  limit = 10,
  showAddButton = true 
}: MajorWorksDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [buildings, setBuildings] = useState<any[]>([])

  useEffect(() => {
    fetchProjects()
    if (showAllBuildings) {
      fetchBuildings()
    }
  }, [selectedBuilding])

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings')
      if (response.ok) {
        const data = await response.json()
        setBuildings(data.buildings || [])
      }
    } catch (error) {
      console.error('Error fetching buildings:', error)
    }
  }

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      let url = '/api/major-works/list?include_documents=true&include_logs=true&include_observations=true'
      if (selectedBuilding !== 'all') {
        url = `/api/major-works/building/${selectedBuilding}?include_documents=true&include_logs=true&include_observations=true`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const allProjects = data.projects || []
        
        // Apply filters
        let filteredProjects = allProjects
        
        if (filterStatus !== 'all') {
          filteredProjects = filteredProjects.filter((project: Project) => project.status === filterStatus)
        }
        
        if (searchTerm) {
          filteredProjects = filteredProjects.filter((project: Project) => 
            project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.buildings?.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }
        
        // Apply limit
        if (limit) {
          filteredProjects = filteredProjects.slice(0, limit)
        }
        
        setProjects(filteredProjects)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planning': return 'bg-blue-100 text-blue-800'
      case 'consultation': return 'bg-yellow-100 text-yellow-800'
      case 'delivery': return 'bg-orange-100 text-orange-800'
      case 'complete': return 'bg-green-100 text-green-800'
      case 'on hold': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthColor = (health: string) => {
    switch (health.toLowerCase()) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'fair': return 'bg-yellow-100 text-yellow-800'
      case 'poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

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

  const getProjectProgress = (project: Project) => {
    if (project.actual_completion_date) return 100
    if (!project.actual_start_date) return 0
    
    const startDate = new Date(project.actual_start_date)
    const endDate = new Date(project.estimated_completion_date)
    const today = new Date()
    
    if (today < startDate) return 0
    if (today > endDate) return 100
    
    const totalDays = differenceInDays(endDate, startDate)
    const daysElapsed = differenceInDays(today, startDate)
    return Math.round((daysElapsed / totalDays) * 100)
  }

  const getDaysRemaining = (project: Project) => {
    if (project.actual_completion_date) return 0
    if (!project.estimated_completion_date) return null
    
    const endDate = new Date(project.estimated_completion_date)
    const today = new Date()
    const days = differenceInDays(endDate, today)
    return days > 0 ? days : 0
  }

  const getActiveProjectsCount = () => {
    return projects.filter(p => p.is_active && p.status !== 'Complete').length
  }

  const getOverdueProjectsCount = () => {
    return projects.filter(p => {
      if (!p.estimated_completion_date || p.actual_completion_date) return false
      const endDate = new Date(p.estimated_completion_date)
      const today = new Date()
      return endDate < today
    }).length
  }

  const getTotalEstimatedCost = () => {
    return projects.reduce((sum, p) => sum + (p.estimated_cost || 0), 0)
  }

  const getTotalActualCost = () => {
    return projects.reduce((sum, p) => sum + (p.actual_cost || 0), 0)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Major Works Dashboard</h2>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Major Works Dashboard</h2>
          <p className="text-gray-600">Track and manage major works projects across all buildings</p>
        </div>
        {showAddButton && (
          <Link href="/major-works/new">
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Major Work
            </Button>
          </Link>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">{getActiveProjectsCount()}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Projects</p>
                <p className="text-2xl font-bold text-red-600">{getOverdueProjectsCount()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900">
                  £{(getTotalEstimatedCost() / 1000).toFixed(0)}k
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Spent to Date</p>
                <p className="text-2xl font-bold text-gray-900">
                  £{(getTotalActualCost() / 1000).toFixed(0)}k
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="Planning">Planning</option>
                <option value="Consultation">Consultation</option>
                <option value="Delivery">Delivery</option>
                <option value="Complete">Complete</option>
                <option value="On Hold">On Hold</option>
              </select>

              {showAllBuildings && (
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Buildings</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Construction className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Major Works Projects</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No projects match your current filters.' 
                  : 'Get started by adding your first major works project.'}
              </p>
              {showAddButton && (
                <Link href="/major-works/new">
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Major Work
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{project.title}</h3>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      <Badge className={getPriorityColor(project.priority)}>
                        {project.priority} Priority
                      </Badge>
                      {project.buildings && (
                        <Badge variant="outline" className="text-gray-600">
                          <Building className="h-3 w-3 mr-1" />
                          {project.buildings.name}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-4">{project.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-600">{getProjectProgress(project)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProjectProgress(project)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Project Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-teal-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Start Date</p>
                          <p className="text-sm text-gray-600">
                            {project.actual_start_date 
                              ? format(new Date(project.actual_start_date), 'dd MMM yyyy')
                              : format(new Date(project.estimated_start_date), 'dd MMM yyyy')
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-orange-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Completion</p>
                          <p className="text-sm text-gray-600">
                            {project.actual_completion_date 
                              ? format(new Date(project.actual_completion_date), 'dd MMM yyyy')
                              : format(new Date(project.estimated_completion_date), 'dd MMM yyyy')
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Budget</p>
                          <p className="text-sm text-gray-600">
                            £{(project.estimated_cost / 1000).toFixed(0)}k
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Contractor</p>
                          <p className="text-sm text-gray-600">{project.contractor_name}</p>
                        </div>
                      </div>
                    </div>

                    {/* Days Remaining Warning */}
                    {getDaysRemaining(project) !== null && getDaysRemaining(project)! <= 30 && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            {getDaysRemaining(project) === 0 
                              ? 'Project is overdue!' 
                              : `${getDaysRemaining(project)} days remaining`
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
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
                    
                    <Link href={`/major-works/${project.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedProject === project.id && (
                  <div className="border-t pt-4 space-y-4">
                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-600">
                          {project.statistics?.total_documents || 0} Documents
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600">
                          {project.statistics?.total_logs || 0} Updates
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-gray-600">
                          {project.statistics?.total_observations || 0} Observations
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link href={`/major-works/${project.id}/logs`}>
                        <Button variant="outline" size="sm">
                          <Activity className="h-4 w-4 mr-2" />
                          View Logs
                        </Button>
                      </Link>
                      <Link href={`/major-works/${project.id}/documents`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Documents
                        </Button>
                      </Link>
                      <Link href={`/major-works/${project.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Project
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