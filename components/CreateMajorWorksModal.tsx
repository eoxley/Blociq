'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Building2, Calendar, FileText, Wrench, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Building {
  id: string  // Changed from number to string (UUID)
  name: string
  address: string | null
}

interface CreateMajorWorksModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (newProject: any) => void
}

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning', icon: FileText, color: 'bg-blue-100 text-blue-800' },
  { value: 'consulting', label: 'Consulting', icon: FileText, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'awaiting_contractor', label: 'Awaiting Contractor', icon: Wrench, color: 'bg-orange-100 text-orange-800' },
  { value: 'in_progress', label: 'In Progress', icon: Wrench, color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-gray-100 text-gray-800' }
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
]

const PROJECT_TYPE_OPTIONS = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-800' },
  { value: 'roofing', label: 'Roofing', color: 'bg-blue-100 text-blue-800' },
  { value: 'electrical', label: 'Electrical', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'plumbing', label: 'Plumbing', color: 'bg-green-100 text-green-800' },
  { value: 'structural', label: 'Structural', color: 'bg-red-100 text-red-800' },
  { value: 'cosmetic', label: 'Cosmetic', color: 'bg-purple-100 text-purple-800' }
]

export default function CreateMajorWorksModal({ 
  isOpen, 
  onClose, 
  onProjectCreated 
}: CreateMajorWorksModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')  // Changed from number to string
  const [selectedStatus, setSelectedStatus] = useState('planning')
  const [selectedPriority, setSelectedPriority] = useState('medium')
  const [selectedProjectType, setSelectedProjectType] = useState('general')

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [expectedDuration, setExpectedDuration] = useState('')

  // Fetch buildings on mount
  useEffect(() => {
    if (isOpen) {
      fetchBuildings()
    }
  }, [isOpen])

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
      toast.error('Failed to load buildings')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!title.trim()) {
      toast.error('Project title is required')
      return
    }
    if (!selectedBuilding) {
      toast.error('Please select a building')
      return
    }
    if (!startDate) {
      toast.error('Start date is required')
      return
    }

    setIsLoading(true)

    try {
      // Use the API endpoint instead of direct Supabase call to ensure consistency
      const response = await fetch('/api/major-works/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          building_id: selectedBuilding,
          start_date: startDate,
          estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
          expected_duration: expectedDuration ? parseInt(expectedDuration) : null,
          project_type: selectedProjectType,
          priority: selectedPriority
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create project')
      }

      const result = await response.json()
      
      toast.success('Major works project created successfully')
      onProjectCreated(result.project)
      handleClose()
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setSelectedBuilding('')
    setSelectedStatus('planning')
    setSelectedPriority('medium')
    setSelectedProjectType('general')
    setStartDate('')
    setEstimatedCost('')
    setExpectedDuration('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300 ease-in-out">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Major Works Project</h2>
            <p className="text-sm text-gray-600 mt-1">Add a new Section 20 major works project</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Project Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Title *
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Roof Replacement Project"
              className="w-full"
              required
            />
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project scope and objectives..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Building Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building *
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            >
              <option value="">Select a building</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name} {building.address && `- ${building.address}`}
                </option>
              ))}
            </select>
          </div>

          {/* Project Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PROJECT_TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedProjectType(type.value)}
                  className={`p-2 rounded-md text-sm font-medium transition-colors ${
                    selectedProjectType === type.value 
                      ? type.color 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setSelectedPriority(priority.value)}
                  className={`p-2 rounded-md text-sm font-medium transition-colors ${
                    selectedPriority === priority.value 
                      ? priority.color 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
              required
            />
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Cost (£)
            </label>
            <Input
              type="number"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full"
            />
          </div>

          {/* Expected Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Duration (days)
            </label>
            <Input
              type="number"
              value={expectedDuration}
              onChange={(e) => setExpectedDuration(e.target.value)}
              placeholder="30"
              min="1"
              className="w-full"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 