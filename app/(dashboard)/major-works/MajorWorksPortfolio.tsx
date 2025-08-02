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
import PageHero from '@/components/PageHero'

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
    <div className="space-y-8">
      <PageHero
        title="Major Works Portfolio"
        subtitle="Manage and track all major works projects"
        icon={<Construction className="h-8 w-8 text-white" />}
      />

      <div className="p-6 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Projects</p>
                <p className="text-3xl font-bold">{projects.length}</p>
              </div>
              <Construction className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Active</p>
                <p className="text-3xl font-bold">{projects.filter(p => p.status === 'active').length}</p>
              </div>
              <Target className="h-8 w-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">In Progress</p>
                <p className="text-3xl font-bold">{projects.filter(p => p.status === 'in_progress').length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Completed</p>
                <p className="text-3xl font-bold">{projects.filter(p => p.status === 'completed').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Project Management</h2>
              <p className="text-gray-600">Track and manage major works projects</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <Button
                onClick={() => setShowNewProjectModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>

            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by building" />
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

            <Select value={contractorFilter} onValueChange={setContractorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by contractor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contractors</SelectItem>
                {Array.from(new Set(projects.map(p => p.contractor_name))).map((contractor) => (
                  <SelectItem key={contractor} value={contractor}>
                    {contractor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_quarter">This Quarter</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => handleViewProject(project)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-2">{project.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(project.priority)}>
                        {project.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* getPriorityIndicator(project) - This function is not defined in the original file */}
                    <Badge className={getHealthColor(project.project_health)}>
                      {project.project_health}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Estimated Cost</p>
                    <p className="font-semibold text-gray-900">£{project.estimated_cost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Completion</p>
                    <p className="font-semibold text-gray-900">{project.completion_percentage}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{project.contractor_name}</span>
                  <span>{project.buildings?.name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        )}

        {!loading && filteredProjects.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <Construction className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first project.'}
            </p>
            <Button
              onClick={() => setShowNewProjectModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        )}
      </div>

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