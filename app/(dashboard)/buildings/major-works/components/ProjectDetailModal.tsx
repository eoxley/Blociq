'use client'

import React, { useState, useEffect } from 'react'
import { 
  Eye, 
  Edit, 
  Save, 
  X,
  Building,
  Calendar,
  DollarSign,
  Users,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Construction,
  MapPin,
  Phone,
  Mail
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'

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

interface ProjectDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  onProjectUpdated: () => void
}

export default function ProjectDetailModal({
  open,
  onOpenChange,
  project,
  onProjectUpdated
}: ProjectDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [observations, setObservations] = useState<any[]>([])
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    if (project && open) {
      setFormData({
        title: project.title,
        description: project.description,
        status: project.status,
        priority: project.priority,
        project_type: project.project_type,
        estimated_start_date: project.estimated_start_date,
        estimated_completion_date: project.estimated_completion_date,
        estimated_cost: project.estimated_cost,
        actual_cost: project.actual_cost,
        completion_percentage: project.completion_percentage,
        contractor_name: project.contractor_name,
        contractor_email: project.contractor_email,
        contractor_phone: project.contractor_phone
      })
      fetchProjectData()
    }
  }, [project, open])

  const fetchProjectData = async () => {
    if (!project) return

    try {
      const responses = await Promise.all([
        supabase.from('major_works_logs').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
        supabase.from('major_works_documents').select('*').eq('project_id', project.id).order('uploaded_at', { ascending: false }),
        supabase.from('major_works_observations').select('*').eq('project_id', project.id).order('created_at', { ascending: false })
      ])

      // Safe destructuring with fallback
      const [logsResult, documentsResult, observationsResult] = responses || [{}, {}, {}]

      setLogs(logsResult.data || [])
      setDocuments(documentsResult.data || [])
      setObservations(observationsResult.data || [])
    } catch (error) {
      console.error('Error fetching project data:', error)
    }
  }

  const handleSave = async () => {
    if (!project) return

    try {
      setLoading(true)

      const { error } = await supabase
        .from('major_works_projects')
        .update({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          project_type: formData.project_type,
          estimated_start_date: formData.estimated_start_date,
          estimated_completion_date: formData.estimated_completion_date,
          estimated_cost: formData.estimated_cost,
          actual_cost: formData.actual_cost,
          completion_percentage: formData.completion_percentage,
          contractor_name: formData.contractor_name,
          contractor_email: formData.contractor_email,
          contractor_phone: formData.contractor_phone
        })
        .eq('id', project.id)

      if (error) throw error

      // Log the update
      await supabase
        .from('major_works_logs')
        .insert({
          project_id: project.id,
          action: 'Project Updated',
          description: `Project details updated`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })

      setIsEditing(false)
      onProjectUpdated()
      toast.success('Project updated successfully')
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error('Failed to update project')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

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

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            {isEditing ? 'Edit Project' : 'Project Details'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Project Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="text-xl font-bold"
                />
              ) : (
                <h2 className="text-xl font-bold">{project.title}</h2>
              )}
              <p className="text-gray-600 mt-1">{project.buildings?.name}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
              <Badge className={getPriorityColor(project.priority)}>
                {project.priority}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Project Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Project Type</Label>
                    {isEditing ? (
                      <Select value={formData.project_type} onValueChange={(value) => handleInputChange('project_type', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="roofing">Roofing</SelectItem>
                          <SelectItem value="electrical">Electrical</SelectItem>
                          <SelectItem value="plumbing">Plumbing</SelectItem>
                          <SelectItem value="heating">Heating</SelectItem>
                          <SelectItem value="structural">Structural</SelectItem>
                          <SelectItem value="cosmetic">Cosmetic</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">{project.project_type}</p>
                    )}
                  </div>

                  <div>
                    <Label>Status</Label>
                    {isEditing ? (
                      <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planned">Planned</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">{project.status}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline & Budget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline & Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={formData.estimated_start_date}
                        onChange={(e) => handleInputChange('estimated_start_date', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">{project.estimated_start_date}</p>
                    )}
                  </div>
                  <div>
                    <Label>Completion Date</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={formData.estimated_completion_date}
                        onChange={(e) => handleInputChange('estimated_completion_date', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">{project.estimated_completion_date}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estimated Cost</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={formData.estimated_cost}
                        onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">£{(project.estimated_cost || 0).toLocaleString()}</p>
                    )}
                  </div>
                  <div>
                    <Label>Actual Cost</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={formData.actual_cost}
                        onChange={(e) => handleInputChange('actual_cost', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">£{(project.actual_cost || 0).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Completion Percentage</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={formData.completion_percentage}
                      onChange={(e) => handleInputChange('completion_percentage', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">{project.completion_percentage}%</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contractor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contractor Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Contractor Name</Label>
                  {isEditing ? (
                    <Input
                      value={formData.contractor_name}
                      onChange={(e) => handleInputChange('contractor_name', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">{project.contractor_name || 'Not assigned'}</p>
                  )}
                </div>
                <div>
                  <Label>Email</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={formData.contractor_email}
                      onChange={(e) => handleInputChange('contractor_email', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">{project.contractor_email || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <Label>Phone</Label>
                  {isEditing ? (
                    <Input
                      value={formData.contractor_phone}
                      onChange={(e) => handleInputChange('contractor_phone', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">{project.contractor_phone || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Documents</p>
                    <p className="text-2xl font-bold text-gray-900">{project.statistics.total_documents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Log Entries</p>
                    <p className="text-2xl font-bold text-gray-900">{project.statistics.total_logs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Observations</p>
                    <p className="text-2xl font-bold text-gray-900">{project.statistics.total_observations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 