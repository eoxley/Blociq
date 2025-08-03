'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  CheckCircle, 
  Circle, 
  Calendar, 
  AlertTriangle, 
  Loader2,
  Clock,
  Flag,
  Building
} from 'lucide-react'
import { BlocIQCard, BlocIQCardContent } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'

type Todo = {
  id: string
  building_id: number
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  is_complete: boolean
  due_date?: string
  priority?: 'Low' | 'Medium' | 'High'
  assigned_to?: string
  created_by?: string
  created_at: string
  updated_at: string
  building?: {
    name: string
  }
}

interface BuildingTodoListProps {
  className?: string
  maxItems?: number
  showBuildingName?: boolean
}

export default function BuildingTodoList({ 
  className = "", 
  maxItems = 5,
  showBuildingName = true 
}: BuildingTodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch overdue and due today todos
  const fetchTodos = async () => {
    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data, error } = await supabase
        .from('building_todos')
        .select(`
          *,
          building:buildings(name)
        `)
        .or(`due_date.lte.${now.toISOString()},and(due_date.gte.${today.toISOString()},due_date.lt.${tomorrow.toISOString()})`)
        .eq('is_complete', false)
        .order('due_date', { ascending: true })
        .limit(maxItems)

      if (error) {
        console.error('Error fetching todos:', error)
        setError('Failed to load tasks')
        return
      }

      setTodos(data || [])
    } catch (error) {
      console.error('Error fetching todos:', error)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  // Toggle todo completion
  const toggleTodo = async (todo: Todo) => {
    try {
      const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
      const { error } = await supabase
        .from('building_todos')
        .update({ 
          status: newStatus,
          is_complete: newStatus === 'completed'
        })
        .eq('id', todo.id)

      if (error) {
        console.error('Error updating todo:', error)
        return
      }

      // Update local state
      setTodos(prev => prev.map(t => 
        t.id === todo.id 
          ? { ...t, status: newStatus, is_complete: newStatus === 'completed' }
          : t
      ))
    } catch (error) {
      console.error('Error updating todo:', error)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [maxItems])

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100 border-red-200'
      case 'Medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'Low': return 'text-green-600 bg-green-100 border-green-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  // Check if task is overdue
  const isOverdue = (todo: Todo) => {
    if (!todo.due_date || todo.status === 'completed') return false
    return new Date(todo.due_date) < new Date()
  }

  // Format due date
  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short' 
      })
    }
  }

  if (loading) {
    return (
      <BlocIQCard className={`h-full flex flex-col ${className}`}>
        <BlocIQCardContent className="p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center text-white">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Building To-Do</h3>
              <p className="text-sm text-gray-600">Loading tasks...</p>
            </div>
          </div>
          <div className="text-center py-8 flex-1 flex items-center justify-center">
            <div>
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Loading tasks...</p>
            </div>
          </div>
        </BlocIQCardContent>
      </BlocIQCard>
    )
  }

  if (error) {
    return (
      <BlocIQCard className={`h-full flex flex-col ${className}`}>
        <BlocIQCardContent className="p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center text-white">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Building To-Do</h3>
              <p className="text-sm text-gray-600">Tasks and deadlines</p>
            </div>
          </div>
          <div className="text-center py-8 flex-1 flex items-center justify-center">
            <div>
              <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        </BlocIQCardContent>
      </BlocIQCard>
    )
  }

  return (
    <BlocIQCard className={`h-full flex flex-col ${className}`}>
      <BlocIQCardContent className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center text-white">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Building To-Do</h3>
            <p className="text-sm text-gray-600">Tasks and deadlines</p>
          </div>
        </div>

        {todos.length === 0 ? (
          <div className="text-center py-8 flex-1 flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500 mb-4">
              No overdue or due tasks found.
            </p>
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto">
            {todos.map((todo) => (
              <div 
                key={todo.id} 
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  todo.status === 'completed' 
                    ? 'bg-gray-50 border-gray-200' 
                    : isOverdue(todo)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => toggleTodo(todo)}
                  className={`mt-1 flex-shrink-0 ${
                    todo.status === 'completed' 
                      ? 'text-green-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {todo.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm ${
                        todo.status === 'completed' 
                          ? 'text-gray-500 line-through' 
                          : 'text-gray-900'
                      }`}>
                        {todo.title}
                      </h4>
                      
                      {todo.description && (
                        <p className={`text-xs mt-1 ${
                          todo.status === 'completed' 
                            ? 'text-gray-400' 
                            : 'text-gray-600'
                        }`}>
                          {todo.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        {showBuildingName && todo.building?.name && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Building className="h-3 w-3" />
                            <span>{todo.building.name}</span>
                          </div>
                        )}
                        
                        {todo.due_date && (
                          <div className={`flex items-center gap-1 text-xs ${
                            isOverdue(todo) 
                              ? 'text-red-600' 
                              : 'text-gray-500'
                          }`}>
                            <Calendar className="h-3 w-3" />
                            <span>{formatDueDate(todo.due_date)}</span>
                            {isOverdue(todo) && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {todo.priority && (
                        <BlocIQBadge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(todo.priority)}`}
                        >
                          {todo.priority}
                        </BlocIQBadge>
                      )}
                      
                      {isOverdue(todo) && (
                        <BlocIQBadge 
                          variant="outline" 
                          className="text-xs text-red-600 bg-red-100 border-red-200"
                        >
                          Overdue
                        </BlocIQBadge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {todos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{todos.length} task{todos.length !== 1 ? 's' : ''} shown</span>
              <a 
                href="/buildings" 
                className="text-[#008C8F] hover:text-[#7645ED] transition-colors"
              >
                View all →
              </a>
            </div>
          </div>
        )}
      </BlocIQCardContent>
    </BlocIQCard>
  )
} 