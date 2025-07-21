'use client'
import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Building, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Edit3, 
  MessageSquare, 
  FileText, 
  Users, 
  Target,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Brain
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import BlocIQLogo from '@/components/BlocIQLogo'
import { toast } from 'sonner'

interface UserData {
  name: string
  email: string
}

interface Project {
  id: string
  title: string
  description: string
  status: string
  start_date: string
  estimated_cost: number
  actual_cost: number
  completion_percentage: number
  priority: string
  project_type: string
  is_active: boolean
  created_at: string
  updated_at: string
  latest_update: {
    action: string
    description: string
    timestamp: string
    metadata: any
  } | null
  total_updates: number
}

interface BuildingGroup {
  building_id: string
  building_name: string
  building_address: string
  projects: Project[]
}

interface MajorWorksClientProps {
  userData: UserData
}

export default function MajorWorksClient({ userData }: MajorWorksClientProps) {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<BuildingGroup[]>([])
  const [summary, setSummary] = useState({
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    total_budget: 0
  })
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  // New project form state
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    building_id: '',
    start_date: '',
    estimated_cost: '',
    expected_duration: '',
    project_type: 'general',
    priority: 'medium'
  })

  // Update form state
  const [updateForm, setUpdateForm] = useState({
    update_text: '',
    action_type: 'update',
    completion_percentage: '',
    cost_update: '',
    include_ai_suggestion: false
  })

  // Available buildings for new projects
  const [buildings, setBuildings] = useState<Array<{id: string, name: string}>>([])

  useEffect(() => {
    fetchProjects()
    fetchBuildings()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/major-works/list')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects_by_building || [])
        setSummary(data.summary || {})
      } else {
        toast.error('Failed to fetch projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Error fetching projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name')
      
      if (!error && data) {
        setBuildings(data)
      }
    } catch (error) {
      console.error('Error fetching buildings:', error)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/major-works/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          estimated_cost: newProject.estimated_cost ? parseFloat(newProject.estimated_cost) : null,
          expected_duration: newProject.expected_duration ? parseInt(newProject.expected_duration) : null
        })
      })

      if (response.ok) {
        toast.success('Project created successfully!')
        setShowNewProjectModal(false)
        setNewProject({
          title: '',
          description: '',
          building_id: '',
          start_date: '',
          estimated_cost: '',
          expected_duration: '',
          project_type: 'general',
          priority: 'medium'
        })
        fetchProjects()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Error creating project')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject) return

    setSubmitting(true)

    try {
      const response = await fetch('/api/major-works/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
          ...updateForm,
          completion_percentage: updateForm.completion_percentage ? parseInt(updateForm.completion_percentage) : null,
          cost_update: updateForm.cost_update ? parseFloat(updateForm.cost_update) : null
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Update added successfully!')
        if (data.ai_suggestion) {
          toast.info(`AI Suggestion: ${data.ai_suggestion}`)
        }
        setShowUpdateModal(false)
        setUpdateForm({
          update_text: '',
          action_type: 'update',
          completion_percentage: '',
          cost_update: '',
          include_ai_suggestion: false
        })
        setSelectedProject(null)
        fetchProjects()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add update')
      }
    } catch (error) {
      console.error('Error adding update:', error)
      toast.error('Error adding update')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleBuildingExpansion = (buildingId: string) => {
    const newExpanded = new Set(expandedBuildings)
    if (newExpanded.has(buildingId)) {
      newExpanded.delete(buildingId)
    } else {
      newExpanded.add(buildingId)
    }
    setExpandedBuildings(newExpanded)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'default'
      case 'notice_of_intention': return 'secondary'
      case 'statement_of_estimates': return 'warning'
      case 'contractor_appointed': return 'info'
      case 'works_in_progress': return 'default'
      case 'completed': return 'success'
      case 'on_hold': return 'warning'
      case 'cancelled': return 'destructive'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'default'
      case 'medium': return 'secondary'
      case 'high': return 'warning'
      case 'critical': return 'destructive'
      default: return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-[#333333] mb-2">Loading Major Works</h3>
          <p className="text-[#64748B]">Fetching your projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Building className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Major Works</h1>
              <p className="text-white/90 text-lg">Project Management & Compliance</p>
            </div>
          </div>
          <BlocIQButton
            onClick={() => setShowNewProjectModal(true)}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Project
          </BlocIQButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <BlocIQCard variant="elevated">
          <BlocIQCardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#333333]">{summary.total_projects}</div>
                <div className="text-sm text-[#64748B]">Total Projects</div>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="elevated">
          <BlocIQCardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#333333]">{summary.active_projects}</div>
                <div className="text-sm text-[#64748B]">Active Projects</div>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="elevated">
          <BlocIQCardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#2078F4] to-blue-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#333333]">{summary.completed_projects}</div>
                <div className="text-sm text-[#64748B]">Completed</div>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="elevated">
          <BlocIQCardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#7645ED] to-purple-600 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#333333]">{formatCurrency(summary.total_budget)}</div>
                <div className="text-sm text-[#64748B]">Total Budget</div>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      </div>

      {/* Projects by Building */}
      {projects.length === 0 ? (
        <BlocIQCard variant="elevated">
          <BlocIQCardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Building className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-[#333333] mb-2">No Major Works Projects</h3>
            <p className="text-[#64748B] mb-6">Get started by creating your first major works project</p>
            <BlocIQButton onClick={() => setShowNewProjectModal(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Create First Project
            </BlocIQButton>
          </BlocIQCardContent>
        </BlocIQCard>
      ) : (
        <div className="space-y-6">
          {projects.map((building) => (
            <BlocIQCard key={building.building_id} variant="elevated">
              <BlocIQCardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                      <Building className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#333333]">{building.building_name}</h2>
                      <p className="text-sm text-[#64748B]">{building.building_address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BlocIQBadge variant="secondary">
                      {building.projects.length} {building.projects.length === 1 ? 'Project' : 'Projects'}
                    </BlocIQBadge>
                    <BlocIQButton
                      variant="outline"
                      size="sm"
                      onClick={() => toggleBuildingExpansion(building.building_id)}
                    >
                      {expandedBuildings.has(building.building_id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </BlocIQButton>
                  </div>
                </div>
              </BlocIQCardHeader>

              {expandedBuildings.has(building.building_id) && (
                <BlocIQCardContent>
                  <div className="space-y-4">
                    {building.projects.map((project) => (
                      <div key={project.id} className="bg-[#FAFAFA] rounded-xl p-4 border border-[#E2E8F0]">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-[#333333]">{project.title}</h3>
                              <BlocIQBadge variant={getStatusColor(project.status)} size="sm">
                                {project.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </BlocIQBadge>
                              <BlocIQBadge variant={getPriorityColor(project.priority)} size="sm">
                                {project.priority}
                              </BlocIQBadge>
                            </div>
                            {project.description && (
                              <p className="text-[#64748B] text-sm mb-2">{project.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-[#64748B]">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(project.start_date)}
                              </div>
                              {project.estimated_cost && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4" />
                                  {formatCurrency(project.estimated_cost)}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                {project.completion_percentage}% Complete
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <BlocIQButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProject(project)
                                setShowUpdateModal(true)
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Update
                            </BlocIQButton>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-[#64748B] mb-1">
                            <span>Progress</span>
                            <span>{project.completion_percentage}%</span>
                          </div>
                          <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-[#008C8F] to-[#007BDB] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${project.completion_percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Latest Update */}
                        {project.latest_update && (
                          <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-4 w-4 text-[#64748B]" />
                              <span className="text-xs text-[#64748B]">
                                Latest Update - {formatDate(project.latest_update.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-[#333333]">{project.latest_update.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </BlocIQCardContent>
              )}
            </BlocIQCard>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#333333]">Create New Project</h2>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-[#64748B]" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProject.title}
                    onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                    placeholder="e.g., Roof Replacement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Building *
                  </label>
                  <select
                    required
                    value={newProject.building_id}
                    onChange={(e) => setNewProject({...newProject, building_id: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  >
                    <option value="">Select a building</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Estimated Cost (£)
                  </label>
                  <input
                    type="number"
                    value={newProject.estimated_cost}
                    onChange={(e) => setNewProject({...newProject, estimated_cost: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                    placeholder="50000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Project Type
                  </label>
                  <select
                    value={newProject.project_type}
                    onChange={(e) => setNewProject({...newProject, project_type: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="renovation">Renovation</option>
                    <option value="compliance">Compliance</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Priority
                  </label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  placeholder="Describe the project scope, requirements, and objectives..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <BlocIQButton
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewProjectModal(false)}
                >
                  Cancel
                </BlocIQButton>
                <BlocIQButton
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? 'Creating...' : 'Create Project'}
                </BlocIQButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Update Modal */}
      {showUpdateModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#333333]">Add Project Update</h2>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-[#64748B]" />
                </button>
              </div>
              <p className="text-[#64748B] mt-2">Project: {selectedProject.title}</p>
            </div>

            <form onSubmit={handleAddUpdate} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">
                  Update Text *
                </label>
                <textarea
                  required
                  value={updateForm.update_text}
                  onChange={(e) => setUpdateForm({...updateForm, update_text: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  placeholder="Describe the progress, milestone achieved, or any important updates..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Action Type
                  </label>
                  <select
                    value={updateForm.action_type}
                    onChange={(e) => setUpdateForm({...updateForm, action_type: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  >
                    <option value="update">General Update</option>
                    <option value="notice_of_intention">Notice of Intention</option>
                    <option value="statement_of_estimates">Statement of Estimates</option>
                    <option value="contractor_appointed">Contractor Appointed</option>
                    <option value="works_started">Works Started</option>
                    <option value="works_completed">Works Completed</option>
                    <option value="project_on_hold">Project On Hold</option>
                    <option value="project_cancelled">Project Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Completion Percentage
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={updateForm.completion_percentage}
                    onChange={(e) => setUpdateForm({...updateForm, completion_percentage: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                    placeholder="0-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">
                  Cost Update (£)
                </label>
                <input
                  type="number"
                  value={updateForm.cost_update}
                  onChange={(e) => setUpdateForm({...updateForm, cost_update: e.target.value})}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  placeholder="Additional cost incurred"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ai_suggestion"
                  checked={updateForm.include_ai_suggestion}
                  onChange={(e) => setUpdateForm({...updateForm, include_ai_suggestion: e.target.checked})}
                  className="rounded border-[#E2E8F0] text-[#008C8F] focus:ring-[#008C8F]"
                />
                <label htmlFor="ai_suggestion" className="text-sm text-[#333333] flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Get AI suggestion for next milestone
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <BlocIQButton
                  type="button"
                  variant="outline"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Cancel
                </BlocIQButton>
                <BlocIQButton
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? 'Adding...' : 'Add Update'}
                </BlocIQButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 