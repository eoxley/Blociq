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
  Building,
  Plus,
  X,
  Trash2,
  Edit3
} from 'lucide-react'
import { BlocIQCard, BlocIQCardContent } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { toast } from 'sonner'

/**
 * Enhanced BuildingTodoList Component
 * 
 * A responsive widget that displays building tasks with hero banner styling
 * and manual add task modal with full CRUD API support.
 * 
 * Features:
 * - Hero banner styling matching Property Events
 * - Manual add task modal with building selection
 * - Full CRUD API integration
 * - Interactive completion toggling
 * - Priority badges (High, Medium, Low)
 * - Overdue task highlighting
 * - Building name display
 * - Responsive design
 * 
 * @param className - Additional CSS classes
 * @param maxItems - Maximum number of tasks to display (default: 5)
 * @param showBuildingName - Whether to show building names (default: true)
 */
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

type Building = {
  id: number
  name: string
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
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddTaskForm, setShowAddTaskForm] = useState(false)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    building_id: '',
    due_date: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    assigned_to: ''
  })

  // Fetch buildings for dropdown
  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name')

      if (error) {
        console.error('Error fetching buildings:', error)
        return
      }

      setBuildings(data || [])
    } catch (error) {
      console.error('Error in fetchBuildings:', error)
    }
  }

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
      
      const response = await fetch('/api/add-building-todo', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: todo.id,
          title: todo.title,
          description: todo.description,
          building_id: todo.building_id,
          due_date: todo.due_date,
          priority: todo.priority,
          assigned_to: todo.assigned_to,
          status: newStatus
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      // Update local state
      setTodos(prev => prev.map(t => 
        t.id === todo.id 
          ? { ...t, status: newStatus, is_complete: newStatus === 'completed' }
          : t
      ))

      toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task marked as pending')
    } catch (error) {
      console.error('Error updating todo:', error)
      toast.error('Failed to update task')
    }
  }

  // Add new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingTask(true)

    try {
      const response = await fetch('/api/add-building-todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          building_id: newTask.building_id || null,
          due_date: newTask.due_date || null,
          priority: newTask.priority,
          assigned_to: newTask.assigned_to || null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create task')
      }

      const data = await response.json()
      toast.success(data.message || 'Task created successfully!')
      
      // Reset form and close modal
      setNewTask({
        title: '',
        description: '',
        building_id: '',
        due_date: '',
        priority: 'Medium',
        assigned_to: ''
      })
      setShowAddTaskForm(false)
      
      // Refresh todos
      fetchTodos()
    } catch (error) {
      console.error('Error adding task:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    } finally {
      setIsAddingTask(false)
    }
  }

  // Delete task
  const handleDeleteTask = async (todoId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const response = await fetch(`/api/add-building-todo?id=${todoId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      // Remove from local state
      setTodos(prev => prev.filter(t => t.id !== todoId))
      toast.success('Task deleted successfully!')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  useEffect(() => {
    fetchBuildings()
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
      <div className={`h-full ${className}`}>
        <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden h-full flex flex-col">
          <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Flag className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Building To-Do</h2>
                  <p className="text-sm text-white/80">Tasks and deadlines</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Loading tasks...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`h-full ${className}`}>
        <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden h-full flex flex-col">
          <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Flag className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Building To-Do</h2>
                  <p className="text-sm text-white/80">Tasks and deadlines</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full ${className}`}>
      <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden h-full flex flex-col">
        {/* Hero Banner Header */}
        <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Flag className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Building To-Do</h2>
                <p className="text-sm text-white/80">Tasks and deadlines</p>
              </div>
            </div>
            
            {/* Add Task Button */}
            <button
              onClick={() => setShowAddTaskForm(true)}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Add Task Form */}
          {showAddTaskForm && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Add New Task</h3>
                <button
                  type="button"
                  onClick={() => setShowAddTaskForm(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAddTask} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                      placeholder="Enter task title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                    <select
                      value={newTask.building_id}
                      onChange={(e) => setNewTask({...newTask, building_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                    >
                      <option value="">General</option>
                      {buildings.map((building) => (
                        <option key={building.id} value={building.id}>
                          {building.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="datetime-local"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value as 'Low' | 'Medium' | 'High'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <input
                      type="text"
                      value={newTask.assigned_to}
                      onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent resize-none"
                    placeholder="Optional task description..."
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isAddingTask}
                    className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAddingTask ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddTaskForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tasks List */}
          <div className="flex-1">
            {todos.length === 0 ? (
            <div className="text-center py-8 flex-1 flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Active Tasks</h3>
                <span className="text-sm text-gray-500">{todos.length} task{todos.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-3">
              {todos.map((todo) => (
                <div 
                  key={todo.id} 
                  className={`bg-gradient-to-r rounded-xl p-4 border transition-all duration-200 hover:shadow-md ${
                    todo.status === 'completed' 
                      ? 'from-gray-50 to-gray-100 border-gray-200' 
                      : isOverdue(todo)
                      ? 'from-red-50 to-pink-50 border-red-200'
                      : 'from-green-50 to-emerald-50 border-green-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
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
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={`font-semibold text-sm ${
                            todo.status === 'completed' 
                              ? 'text-gray-500 line-through' 
                              : 'text-gray-900'
                          }`}>
                            {todo.title}
                          </h4>
                          {isOverdue(todo) && (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 flex-shrink-0">
                              Overdue
                            </span>
                          )}
                        </div>
                        
                        {todo.description && (
                          <p className={`text-xs mb-2 ${
                            todo.status === 'completed' 
                              ? 'text-gray-400' 
                              : 'text-gray-600'
                          }`}>
                            {todo.description}
                          </p>
                        )}

                        <div className="space-y-1 text-sm text-gray-600">
                          {showBuildingName && todo.building?.name && (
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span>{todo.building.name}</span>
                            </div>
                          )}
                          
                          {todo.due_date && (
                            <div className={`flex items-center gap-1 ${
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
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {todo.priority && (
                        <BlocIQBadge 
                          className={`text-xs ${getPriorityColor(todo.priority)}`}
                        >
                          {todo.priority}
                        </BlocIQBadge>
                      )}
                      
                      <button
                        onClick={() => handleDeleteTask(todo.id)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {todos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{todos.length} task{todos.length !== 1 ? 's' : ''} shown</span>
                <a 
                  href="/buildings" 
                  className="text-[#4f46e5] hover:text-[#a855f7] transition-colors"
                >
                  View all →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}