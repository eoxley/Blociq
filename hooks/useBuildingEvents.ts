"use client";

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSession } from '@/lib/auth'
import { useCurrentBuilding } from './useCurrentBuilding'

interface Event {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  category: string
  building_id: number
  created_at: string
  updated_at: string
}

interface UseBuildingEventsReturn {
  events: Event[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBuildingEvents(): UseBuildingEventsReturn {
  const { user, loading: sessionLoading } = useSession()
  const { currentBuilding, loading: buildingLoading } = useCurrentBuilding()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async () => {
    if (!user?.id || !currentBuilding?.id) {
      console.log('👤 Missing user or building, skipping event fetch')
      setLoading(false)
      return
    }

    try {
      console.log('📅 Fetching events for building:', currentBuilding.id)
      console.log('👤 User ID:', user.id)
      console.log('🏢 Building ID:', currentBuilding.id)

      const { data, error } = await supabase
        .from('property_events')
        .select('*')
        .eq('building_id', currentBuilding.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10)

      if (error) {
        console.error('❌ Error fetching events:', error)
        setError(`Failed to fetch events: ${error.message}`)
        return
      }

      console.log('✅ Events loaded:', data?.length || 0, 'items')
      setEvents(data || [])
      setError(null)
    } catch (error) {
      console.error('❌ Error in fetchEvents:', error)
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionLoading || buildingLoading) return

    fetchEvents()
  }, [user?.id, currentBuilding?.id, sessionLoading, buildingLoading])

  return {
    events,
    loading: sessionLoading || buildingLoading || loading,
    error,
    refetch: fetchEvents
  }
} 