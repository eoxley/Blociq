'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { MessageSquare, User, Calendar, Plus, Trash2, Search, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface ProjectObservation {
  id: number
  project_id: number
  phase: string
  observer_type: string
  comment: string
  notify_director?: boolean
  created_at: string
}

interface ProjectObservationsProps {
  projectId: number
}

const OBSERVER_TYPES = [
  { value: 'leaseholder', label: 'Leaseholder', icon: User, color: 'bg-blue-100 text-blue-800' },
  { value: 'director', label: 'Director', icon: User, color: 'bg-green-100 text-green-800' },
  { value: 'contractor', label: 'Contractor', icon: User, color: 'bg-orange-100 text-orange-800' },
  { value: 'other', label: 'Other', icon: User, color: 'bg-gray-100 text-gray-800' }
]

const PHASES = [
  { value: 'notice_intention', label: 'Notice of Intention' },
  { value: 'estimates', label: 'Estimates' }
]

export default function ProjectObservations({ projectId }: ProjectObservationsProps) {
  const supabase = createClientComponentClient()
  const [observations, setObservations] = useState<ProjectObservation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredObservations, setFilteredObservations] = useState<ProjectObservation[]>([])

  // Form state for each phase
  const [noticeForm, setNoticeForm] = useState({
    observerType: '',
    comment: '',
    notifyDirector: false
  })
  const [estimatesForm, setEstimatesForm] = useState({
    observerType: '',
    comment: '',
    notifyDirector: false
  })

  // Fetch existing observations
  useEffect(() => {
    fetchObservations()
  }, [projectId])

  // Filter observations based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredObservations(observations)
      return
    }

    const filtered = observations.filter(observation => {
      const query = searchQuery.toLowerCase()
      return (
        observation.comment.toLowerCase().includes(query) ||
        observation.observer_type.toLowerCase().includes(query) ||
        observation.phase.toLowerCase().includes(query) ||
        new Date(observation.created_at).toLocaleDateString('en-GB').includes(query)
      )
    })
    setFilteredObservations(filtered)
  }, [searchQuery, observations])

  const fetchObservations = async () => {
    try {
      const { data, error } = await supabase
        .from('project_observations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setObservations(data || [])
    } catch (error) {
      console.error('Error fetching observations:', error)
      toast.error('Failed to load observations')
    }
  }

  const handleSubmit = async (phase: string, formData: { observerType: string; comment: string; notifyDirector: boolean }) => {
    if (!formData.observerType || !formData.comment.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: observation, error } = await supabase
        .from('project_observations')
        .insert({
          project_id: projectId,
          phase,
          observer_type: formData.observerType,
          comment: formData.comment.trim(),
          ...(formData.notifyDirector && { notify_director: formData.notifyDirector })
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Observation added successfully')
      setObservations(prev => [observation, ...prev])

      // Reset form
      if (phase === 'notice_intention') {
        setNoticeForm({ observerType: '', comment: '', notifyDirector: false })
      } else {
        setEstimatesForm({ observerType: '', comment: '', notifyDirector: false })
      }
    } catch (error) {
      console.error('Error adding observation:', error)
      toast.error('Failed to add observation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (observationId: number) => {
    if (!confirm('Are you sure you want to delete this observation?')) return

    try {
      const { error } = await supabase
        .from('project_observations')
        .delete()
        .eq('id', observationId)

      if (error) throw error

      toast.success('Observation deleted successfully')
      setObservations(prev => prev.filter(obs => obs.id !== observationId))
    } catch (error) {
      console.error('Error deleting observation:', error)
      toast.error('Failed to delete observation')
    }
  }

  const getPhaseLabel = (phase: string) => {
    return PHASES.find(p => p.value === phase)?.label || phase
  }

  const getObserverLabel = (observerType: string) => {
    return OBSERVER_TYPES.find(o => o.value === observerType)?.label || observerType
  }

  const getObservationsByPhase = (phase: string) => {
    return filteredObservations.filter(obs => obs.phase === phase)
  }

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by comment, type, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-600 mt-2">
            Found {filteredObservations.length} observation{filteredObservations.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Notice of Intention Observations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Notice of Intention Observations
        </h3>

        {/* Add Observation Form */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observer Type
              </label>
              <select
                value={noticeForm.observerType}
                onChange={(e) => setNoticeForm(prev => ({ ...prev, observerType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Select observer type</option>
                {OBSERVER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <div className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md">
                {new Date().toLocaleDateString('en-GB')} (Auto-filled)
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment
            </label>
            <Textarea
              value={noticeForm.comment}
              onChange={(e) => setNoticeForm(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Enter your observation or comment..."
              rows={3}
              className="w-full"
            />
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Checkbox
              id="notice-notify"
              checked={noticeForm.notifyDirector}
              onCheckedChange={(checked: boolean) => setNoticeForm(prev => ({ ...prev, notifyDirector: checked }))}
            />
            <label htmlFor="notice-notify" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notify Director
            </label>
          </div>
          <Button
            onClick={() => handleSubmit('notice_intention', noticeForm)}
            disabled={isSubmitting || !noticeForm.observerType || !noticeForm.comment.trim()}
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Adding...' : 'Add Observation'}
          </Button>
        </div>

        {/* Observations List */}
        {getObservationsByPhase('notice_intention').length > 0 && (
          <div className="space-y-3">
            {getObservationsByPhase('notice_intention').map((observation) => (
              <div key={observation.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {getObserverLabel(observation.observer_type)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(observation.created_at).toLocaleDateString('en-GB')}
                      </span>
                      {observation.notify_director === true && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <Bell className="h-3 w-3 mr-1" />
                          Notified
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-700">{observation.comment}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(observation.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estimates Observations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-600" />
          Estimates Observations
        </h3>

        {/* Add Observation Form */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observer Type
              </label>
              <select
                value={estimatesForm.observerType}
                onChange={(e) => setEstimatesForm(prev => ({ ...prev, observerType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Select observer type</option>
                {OBSERVER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <div className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md">
                {new Date().toLocaleDateString('en-GB')} (Auto-filled)
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment
            </label>
            <Textarea
              value={estimatesForm.comment}
              onChange={(e) => setEstimatesForm(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Enter your observation or comment..."
              rows={3}
              className="w-full"
            />
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Checkbox
              id="estimates-notify"
              checked={estimatesForm.notifyDirector}
              onCheckedChange={(checked: boolean) => setEstimatesForm(prev => ({ ...prev, notifyDirector: checked }))}
            />
            <label htmlFor="estimates-notify" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notify Director
            </label>
          </div>
          <Button
            onClick={() => handleSubmit('estimates', estimatesForm)}
            disabled={isSubmitting || !estimatesForm.observerType || !estimatesForm.comment.trim()}
            className="mt-4 bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Adding...' : 'Add Observation'}
          </Button>
        </div>

        {/* Observations List */}
        {getObservationsByPhase('estimates').length > 0 && (
          <div className="space-y-3">
            {getObservationsByPhase('estimates').map((observation) => (
              <div key={observation.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {getObserverLabel(observation.observer_type)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(observation.created_at).toLocaleDateString('en-GB')}
                      </span>
                      {observation.notify_director === true && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <Bell className="h-3 w-3 mr-1" />
                          Notified
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-700">{observation.comment}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(observation.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 