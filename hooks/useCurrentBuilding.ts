"use client";

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSession } from '@/lib/auth'

interface Building {
  id: number
  name: string
  address?: string
  unit_count?: number
}

interface UseCurrentBuildingReturn {
  currentBuilding: Building | null
  loading: boolean
  error: string | null
  setCurrentBuilding: (building: Building | null) => void
}

export function useCurrentBuilding(): UseCurrentBuildingReturn {
  const { user, loading: sessionLoading } = useSession()
  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionLoading) return

    const fetchUserBuildings = async () => {
      if (!user?.id) {
        console.log('👤 No user ID, skipping building fetch')
        setLoading(false)
        return
      }

      try {
        console.log('🏢 Fetching buildings for user:', user.id)
        
        // First, get buildings the user has access to
        const { data: userBuildings, error: userBuildingsError } = await supabase
          .from('building_members')
          .select(`
            building_id,
            buildings (
              id,
              name,
              address,
              unit_count
            )
          `)
          .eq('user_id', user.id)

        if (userBuildingsError) {
          console.error('❌ Error fetching user buildings:', userBuildingsError)
          setError('Failed to fetch user buildings')
          return
        }

        console.log('✅ User buildings loaded:', userBuildings)

        if (userBuildings && userBuildings.length > 0) {
          // Set the first building as current (you could add logic to remember the last selected building)
          const firstBuilding = userBuildings[0].buildings as Building
          setCurrentBuilding(firstBuilding)
          console.log('🏢 Set current building:', firstBuilding.name)
        } else {
          console.log('⚠️ No buildings found for user')
          setCurrentBuilding(null)
        }
      } catch (error) {
        console.error('❌ Error in fetchUserBuildings:', error)
        setError('Failed to load buildings')
      } finally {
        setLoading(false)
      }
    }

    fetchUserBuildings()
  }, [user?.id, sessionLoading])

  return {
    currentBuilding,
    loading: sessionLoading || loading,
    error,
    setCurrentBuilding
  }
} 