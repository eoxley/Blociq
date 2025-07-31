'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Building, 
  Calendar, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Eye,
  Search,
  Filter,
  Download,
  Upload,
  Construction,
  Target,
  TrendingUp,
  Users,
  FileText,
  MapPin
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import NewProjectModal from './components/NewProjectModal'
import ProjectDetailModal from './components/ProjectDetailModal'

interface UserData {
  name: string
  email: string
}

interface Filters {
  buildingId?: string
  status?: string
  contractor?: string
  dateRange?: string
}

interface MajorWorksPortfolioProps {
  userData: UserData
  filters: Filters
}

interface Project {
  id: string
  title: string
  description: string
  status: string
  consultation_stage: string
  estimated_start_date: string
  estimated_completion_date: string
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
}

export default function MajorWorksPortfolio({ userData, filters }: MajorWorksPortfolioProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [buildings, setBuildings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(filters.status || 'all')
  const [buildingFilter, setBuildingFilter] = useState<string>(filters.buildingId || 'all')
  const [contractorFilter, setContractorFilter] = useState<string>(filters.contractor || 'all')
  const [dateRangeFilter, setDateRangeFilter] = useState<string>(filters.dateRange || 'all')
  
  // Modal states
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showProjectDetailModal, setShowProjectDetailModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  useEffect(() => {
    fetchBuildings()
    fetchProjects()
  }, [])

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, address')
        .order('name')

      if (error) throw error
      setBuildings(data || [])
    } catch (error) {
      console.error('Error fetching buildings:', error)
      toast.error('Failed to fetch buildings')
    }
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('major_works_projects')
        .select(`
          *,
          buildings (
            id,
            name,
            address
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (buildingFilter !== 'all') {
        query = query.eq('building_id', buildingFilter)
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (contractorFilter !== 'all') {
        query = query.ilike('contractor_name', `%${contractorFilter}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Process projects with additional statistics
      const processedProjects = await Promise.all(
        (data || []).map(async (project) => {
          // Fetch related data for statistics
          const [documentsResult, logsResult, observationsResult] = await Promise.all([
            supabase.from('major_works_documents').select('id', { count: 'exact' }).eq('project_id', project.id),
            supabase.from('major_works_logs').select('id', { count: 'exact' }).eq('project_id', project.id),
            supabase.from('major_works_observations').select('id', { count: 'exact' }).eq('project_id', project.id)
          ])

          const statistics = {
            total_documents: documentsResult.count || 0,
            total_logs: logsResult.count || 0,
            total_observations: observationsResult.count || 0,
            days_since_start: project.estimated_start_date ? 
              Math.floor((Date.now() - new Date(project.estimated_start_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
            days_until_completion: project.estimated_completion_date ? 
              Math.floor((new Date(project.estimated_completion_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
          }

          // Calculate project health
          let projectHealth = 'good'
          if (project.completion_percentage < 25 && statistics.days_since_start && statistics.days_since_start > 30) {
            projectHealth = 'at_risk'
          } else if (statistics.days_until_completion && statistics.days_until_completion < 0) {
            projectHealth = 'overdue'
          } else if (project.completion_percentage > 90) {
            projectHealth = 'nearing_completion'
          }

          return {
            ...project,
            statistics,
            project_health: projectHealth,
            latest_activity: null // Could be enhanced with actual latest activity
          }
        })
      )

      setProjects(processedProjects)
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to fetch major works projects')
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.contractor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.buildings?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDateRange = dateRangeFilter === 'all' || 
      (dateRangeFilter === 'overdue' && project.statistics.days_until_completion && project.statistics.days_until_completion < 0) ||
      (dateRangeFilter === 'upcoming' && project.statistics.days_until_completion && project.statistics.days_until_completion > 0 && project.statistics.days_until_completion <= 30) ||
      (dateRangeFilter === 'recent' && project.statistics.days_since_start && project.statistics.days_since_start <= 7)
    
    return matchesSearch && matchesDateRange
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-800'
      case 'ongoing':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'at_risk':
        return 'bg-orange-100 text-orange-800'
      case 'nearing_completion':
        return 'bg-green-100 text-green-800'
      case 'good':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleViewProject = (project: Project) => {
    setSelectedProject(project)
    setShowProjectDetailModal(true)
  }

  const handleProjectCreated = () => {
    fetchProjects()
    setShowNewProjectModal(false)
    toast.success('Major works project created successfully')
  }

  const getProjectStats = () => {
    const total = projects.length
    const active = projects.filter(p => p.status === 'ongoing').length
    const completed = projects.filter(p => p.status === 'completed').length
    const overdue = projects.filter(p => p.project_health === 'overdue').length
    const totalCost = projects.reduce((sum, p) => sum + (p.estimated_cost || 0), 0)

    return { total, active, completed, overdue, totalCost }
  }

  const stats = getProjectStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Major Works Portfolio</h1>
          <p className="text-gray-600 mt-2">Track and manage all major works projects across your portfolio</p>
        </div>
        <Button onClick={() => setShowNewProjectModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Start New Project
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Construction className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900">£{(stats.totalCost / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Search</label>
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Building</label>
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Contractor</label>
              <Input
                placeholder="Filter by contractor..."
                value={contractorFilter}
                onChange={(e) => setContractorFilter(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Date Range</label>
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="upcoming">Upcoming (30 days)</SelectItem>
                  <SelectItem value="recent">Recent (7 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading major works projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Construction className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No major works projects yet</h3>
            <p className="text-gray-600 mb-4">Start your first major works project to begin tracking capital projects across your portfolio.</p>
            <Button onClick={() => setShowNewProjectModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Start New Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewProject(project)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{project.buildings?.name}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                    <Badge className={getPriorityColor(project.priority)}>
                      {project.priority}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Contractor</p>
                    <p className="font-medium">{project.contractor_name || 'Not assigned'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Budget</p>
                    <p className="font-medium">£{(project.estimated_cost || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Progress</p>
                    <p className="font-medium">{project.completion_percentage}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Health</p>
                    <Badge className={getHealthColor(project.project_health)}>
                      {project.project_health.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <FileText className="h-3 w-3 mr-1" />
                      {project.statistics.total_documents}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {project.statistics.total_logs}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <NewProjectModal
        open={showNewProjectModal}
        onOpenChange={setShowNewProjectModal}
        buildings={buildings}
        onProjectCreated={handleProjectCreated}
        userData={userData}
      />

      <ProjectDetailModal
        open={showProjectDetailModal}
        onOpenChange={setShowProjectDetailModal}
        project={selectedProject}
        onProjectUpdated={fetchProjects}
      />
    </div>
  )
} 