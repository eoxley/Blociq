'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Building2, Calendar, FileText, Wrench, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Building {
  id: number
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

export default function CreateMajorWorksModal({ 
  isOpen, 
  onClose, 
  onProjectCreated 
}: CreateMajorWorksModalProps) {
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<number | ''>('')
  const [selectedStatus, setSelectedStatus] = useState('planning')

  // Form fields
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [estimatesDate, setEstimatesDate] = useState('')
  const [constructionDate, setConstructionDate] = useState('')
  const [completionDate, setCompletionDate] = useState('')

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
      const { data, error } = await supabase
        .from('major_works')
        .insert({
          title: title.trim(),
          building_id: selectedBuilding,
          start_date: startDate,
          estimates_issued: estimatesDate || null,
          construction_start: constructionDate || null,
          completion_date: completionDate || null,
          status: selectedStatus
        })
        .select(`
          *,
          buildings (
            name,
            address
          )
        `)
        .single()

      if (error) throw error

      toast.success('Major works project created successfully')
      onProjectCreated(data)
      handleClose()
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setSelectedBuilding('')
    setSelectedStatus('planning')
    setStartDate('')
    setEstimatesDate('')
    setConstructionDate('')
    setCompletionDate('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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

          {/* Building Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building *
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value ? Number(e.target.value) : '')}
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

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setSelectedStatus(status.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedStatus === status.value
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <status.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{status.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dates Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Key Dates
            </h3>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date / Notice of Intention Date *
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
                required
              />
            </div>

            {/* Estimates Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimates Issued Date (optional)
              </label>
              <Input
                type="date"
                value={estimatesDate}
                onChange={(e) => setEstimatesDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Construction Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Construction Start Date (optional)
              </label>
              <Input
                type="date"
                value={constructionDate}
                onChange={(e) => setConstructionDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Completion Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Completion Date (optional)
              </label>
              <Input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
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