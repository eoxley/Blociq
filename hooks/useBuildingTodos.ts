"use client";

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSession } from '@/lib/auth'
import { useCurrentBuilding } from './useCurrentBuilding'

interface Todo {
  id: number
  title: string
  description?: string
  due_date?: string
  priority: 'Low' | 'Medium' | 'High'
  status: 'Pending' | 'In Progress' | 'Completed'
  building_id: number
  created_at: string
  updated_at: string
}

interface UseBuildingTodosReturn {
  todos: Todo[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBuildingTodos(): UseBuildingTodosReturn {
  const { user, loading: sessionLoading } = useSession()
  const { currentBuilding, loading: buildingLoading } = useCurrentBuilding()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTodos = async () => {
    if (!user?.id || !currentBuilding?.id) {
      console.log('👤 Missing user or building, skipping todo fetch')
      setLoading(false)
      return
    }

    try {
      console.log('📋 Fetching todos for building:', currentBuilding.id)
      console.log('👤 User ID:', user.id)
      console.log('🏢 Building ID:', currentBuilding.id)

      const { data, error } = await supabase
        .from('building_todos')
        .select('*')
        .eq('building_id', currentBuilding.id)
        .order('due_date', { ascending: true })

      if (error) {
        console.error('❌ Error fetching todos:', error)
        setError(`Failed to fetch todos: ${error.message}`)
        return
      }

      console.log('✅ Todos loaded:', data?.length || 0, 'items')
      setTodos(data || [])
      setError(null)
    } catch (error) {
      console.error('❌ Error in fetchTodos:', error)
      setError('Failed to load todos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionLoading || buildingLoading) return

    fetchTodos()
  }, [user?.id, currentBuilding?.id, sessionLoading, buildingLoading])

  return {
    todos,
    loading: sessionLoading || buildingLoading || loading,
    error,
    refetch: fetchTodos
  }
} 