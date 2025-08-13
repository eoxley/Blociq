'use client'

import React, { useState } from 'react'
import { 
  Plus, 
  Building, 
  Calendar, 
  DollarSign, 
  Users, 
  FileText,
  X,
  Save
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'

interface UserData {
  name: string
  email: string
}

interface Building {
  id: string
  name: string
  address: string
}

interface NewProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  buildings: Building[]
  onProjectCreated: () => void
  userData: UserData
}

export default function NewProjectModal({
  open,
  onOpenChange,
  buildings,
  onProjectCreated,
  userData
}: NewProjectModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    building_id: '',
    status: 'planned',
    priority: 'medium',
    project_type: 'general',
    estimated_start_date: '',
    estimated_completion_date: '',
    estimated_cost: '',
    contractor_name: '',
    contractor_email: '',
    contractor_phone: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.building_id) {
      toast.error('Please fill in the required fields')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('major_works_projects')
        .insert({
          title: formData.title,
          description: formData.description,
          building_id: formData.building_id,
          status: formData.status,
          priority: formData.priority,
          project_type: formData.project_type,
          estimated_start_date: formData.estimated_start_date || null,
          estimated_completion_date: formData.estimated_completion_date || null,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          contractor_name: formData.contractor_name || null,
          contractor_email: formData.contractor_email || null,
          contractor_phone: formData.contractor_phone || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

      if (error) throw error

      // Create initial log entry
      await supabase
        .from('major_works_logs')
        .insert({
          project_id: data.id,
          action: 'Project Created',
          description: `Project "${formData.title}" created by ${userData.name}`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })

      // Reset form
      setFormData({
        title: '',
        description: '',
        building_id: '',
        status: 'planned',
        priority: 'medium',
        project_type: 'general',
        estimated_start_date: '',
        estimated_completion_date: '',
        estimated_cost: '',
        contractor_name: '',
        contractor_email: '',
        contractor_phone: ''
      })

      onProjectCreated()
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Start New Major Works Project
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div>
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter project title..."
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the project scope and objectives..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="building">Assign to Building *</Label>
              <Select value={formData.building_id} onValueChange={(value) => handleInputChange('building_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a building" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Project Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
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
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project_type">Project Type</Label>
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
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Timeline</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_start_date">Estimated Start Date</Label>
                <Input
                  id="estimated_start_date"
                  type="date"
                  value={formData.estimated_start_date}
                  onChange={(e) => handleInputChange('estimated_start_date', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="estimated_completion_date">Estimated Completion Date</Label>
                <Input
                  id="estimated_completion_date"
                  type="date"
                  value={formData.estimated_completion_date}
                  onChange={(e) => handleInputChange('estimated_completion_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Budget</h3>
            
            <div>
              <Label htmlFor="estimated_cost">Estimated Cost (£)</Label>
              <Input
                id="estimated_cost"
                type="number"
                value={formData.estimated_cost}
                onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                placeholder="Enter estimated cost..."
              />
            </div>
          </div>

          {/* Contractor Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contractor Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contractor_name">Contractor Name</Label>
                <Input
                  id="contractor_name"
                  value={formData.contractor_name}
                  onChange={(e) => handleInputChange('contractor_name', e.target.value)}
                  placeholder="Enter contractor name..."
                />
              </div>

              <div>
                <Label htmlFor="contractor_email">Contractor Email</Label>
                <Input
                  id="contractor_email"
                  type="email"
                  value={formData.contractor_email}
                  onChange={(e) => handleInputChange('contractor_email', e.target.value)}
                  placeholder="Enter contractor email..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contractor_phone">Contractor Phone</Label>
              <Input
                id="contractor_phone"
                value={formData.contractor_phone}
                onChange={(e) => handleInputChange('contractor_phone', e.target.value)}
                placeholder="Enter contractor phone..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.title || !formData.building_id}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 