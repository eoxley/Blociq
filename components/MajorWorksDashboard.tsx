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
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [buildings, setBuildings] = useState<any[]>([])

  useEffect(() => {
    fetchBuildings()
    fetchProjects()
  }, [])

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
    try {
      setIsLoading(true)
      const response = await fetch('/api/major-works/list')
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
    const colors: { [key: string]: string } = {
      'Planning': 'bg-blue-100 text-blue-800',
      'Consultation': 'bg-yellow-100 text-yellow-800',
      'Delivery': 'bg-green-100 text-green-800',
      'Complete': 'bg-gray-100 text-gray-800',
      'On Hold': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      'High': 'bg-red-100 text-red-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-green-100 text-green-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const getHealthColor = (health: string) => {
    const colors: { [key: string]: string } = {
      'Good': 'bg-green-100 text-green-800',
      'At Risk': 'bg-yellow-100 text-yellow-800',
      'Critical': 'bg-red-100 text-red-800'
    }
    return colors[health] || 'bg-gray-100 text-gray-800'
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
    if (project.completion_percentage) return project.completion_percentage
    return 0
  }

  const getDaysRemaining = (project: Project) => {
    const completionDate = project.actual_completion_date || project.estimated_completion_date
    if (!completionDate) return null
    
    const today = new Date()
    const completion = new Date(completionDate)
    const diffTime = completion.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  const getActiveProjectsCount = () => {
    return projects.filter(p => p.status !== 'Complete' && p.is_active).length
  }

  const getOverdueProjectsCount = () => {
    return projects.filter(p => {
      const daysRemaining = getDaysRemaining(p)
      return daysRemaining !== null && daysRemaining < 0 && p.status !== 'Complete'
    }).length
  }

  const getTotalProjectsCount = () => {
    return projects.length
  }

  const getCompletedProjectsCount = () => {
    return projects.filter(p => p.status === 'Complete').length
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
    <div className="space-y-8">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">Major Works Management</h1>
              <p className="text-teal-100 text-lg">Track and manage major works projects across all buildings</p>
            </div>
            <div className="flex items-center gap-4">
              {showAddButton && (
                <Link href="/major-works/new">
                  <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Major Work
                  </Button>
                </Link>
              )}
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Activity className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-teal-50 to-teal-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-teal-700 group-hover:scale-110 transition-transform duration-300">
                  {getTotalProjectsCount()}
                </div>
                <div className="text-sm text-teal-600 font-medium">Total Projects</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Construction className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-700 group-hover:scale-110 transition-transform duration-300">
                  {getActiveProjectsCount()}
                </div>
                <div className="text-sm text-blue-600 font-medium">Active Projects</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-700 group-hover:scale-110 transition-transform duration-300">
                  {getOverdueProjectsCount()}
                </div>
                <div className="text-sm text-red-600 font-medium">Overdue Projects</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-700 group-hover:scale-110 transition-transform duration-300">
                  {getCompletedProjectsCount()}
                </div>
                <div className="text-sm text-green-600 font-medium">Completed</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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