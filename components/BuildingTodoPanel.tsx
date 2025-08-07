'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  CheckCircle, 
  Circle, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  AlertTriangle, 
  RefreshCw, 
  Brain,
  Loader2,
  X,
  Save,
  Filter,
  Pin,
  User
} from 'lucide-react'
import AIButton from './AIButton'

type Todo = {
  id: string
  building_id: number
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  is_complete: boolean // For backward compatibility
  due_date?: string
  priority?: 'Low' | 'Medium' | 'High'
  assigned_to?: string
  created_by?: string
  created_at: string
  updated_at: string
  source?: 'building_todos' | 'building_tasks' // Track which table it came from
}

type Task = {
  id: string
  building_id: string
  task: string
  due_date: string | null
  assigned_to: string | null
  status: 'Not Started' | 'In Progress' | 'Complete'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  notes: string | null
  created_at: string
  created_by: string | null
}

// Unified interface for display
type UnifiedTodo = {
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
  source: 'building_todos' | 'building_tasks'
}

type Summary = {
  summary: string
  statistics: {
    completedThisWeek: number
    overdueTasks: number
    highPriorityTasks: number
    totalTasks: number
    completedTasks: number
    completionRate: number
  }
  lastUpdated: string
}

type FilterType = 'All' | 'Pending' | 'In Progress' | 'Completed'

interface BuildingTodoPanelProps {
  buildingId: number
}

export default function BuildingTodoPanel({ buildingId }: BuildingTodoPanelProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTodo, setEditingTodo] = useState<UnifiedTodo | null>(null)
  const [filter, setFilter] = useState<FilterType>('All')
  const [deleteConfirmTodo, setDeleteConfirmTodo] = useState<UnifiedTodo | null>(null)
  const [newTodo, setNewTodo] = useState({
    title: '',
    due_date: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High'
  })

  // Fetch todos from building_todos table
  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('building_todos')
        .select('*')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching todos:', error)
        return
      }

      // Add source identifier to todos
      const todosWithSource = (data || []).map(todo => ({
        ...todo,
        source: 'building_todos' as const
      }))
      setTodos(todosWithSource)
    } catch (error) {
      console.error('Error fetching todos:', error)
    }
  }

  // Convert Task to UnifiedTodo
  const convertTaskToUnifiedTodo = (task: Task): UnifiedTodo => ({
    id: task.id,
    building_id: parseInt(task.building_id),
    title: task.task,
    description: task.notes || undefined,
    status: task.status === 'Complete' ? 'completed' : 
            task.status === 'In Progress' ? 'in_progress' : 'pending',
    is_complete: task.status === 'Complete',
    due_date: task.due_date || undefined,
    priority: task.priority === 'Urgent' ? 'High' : task.priority,
    assigned_to: task.assigned_to || undefined,
    created_by: task.created_by || undefined,
    created_at: task.created_at,
    updated_at: task.created_at, // building_tasks doesn't have updated_at
    source: 'building_tasks'
  })

  // Fetch tasks from building_tasks table
  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/building-tasks?buildingId=${buildingId}`)
      const data = await response.json()

      if (data.success) {
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch summary
  const fetchSummary = async () => {
    setSummaryLoading(true)
    try {
      const response = await fetch(`/api/summarise-building-todos?building_id=${buildingId}`)
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
    } finally {
      setSummaryLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
    fetchTasks()
    fetchSummary()
  }, [buildingId])

  // Combine and sort all items
  const getAllItems = (): UnifiedTodo[] => {
    const todosWithSource = todos.map(todo => ({ ...todo, source: 'building_todos' as const }))
    const tasksAsUnified = tasks.map(convertTaskToUnifiedTodo)
    return [...todosWithSource, ...tasksAsUnified]
  }

  // Sort and filter todos
  const getSortedAndFilteredTodos = () => {
    const allItems = getAllItems()
    let filteredItems = allItems

    // Apply filter
    switch (filter) {
      case 'Pending':
        filteredItems = allItems.filter(item => item.status === 'pending')
        break
      case 'In Progress':
        filteredItems = allItems.filter(item => item.status === 'in_progress')
        break
      case 'Completed':
        filteredItems = allItems.filter(item => item.status === 'completed')
        break
      default:
        filteredItems = allItems
    }

    // Sort: pending first, then in progress, then completed, then by due date, then by priority
    return filteredItems.sort((a, b) => {
      // First: status priority (pending > in_progress > completed)
      const statusOrder = { 'pending': 3, 'in_progress': 2, 'completed': 1 }
      const aStatus = statusOrder[a.status] || 1
      const bStatus = statusOrder[b.status] || 1
      if (aStatus !== bStatus) {
        return bStatus - aStatus
      }

      // Second: by due date (earliest first, null dates last)
      const aDate = a.due_date ? new Date(a.due_date) : null
      const bDate = b.due_date ? new Date(b.due_date) : null
      
      if (aDate && bDate) {
        return aDate.getTime() - bDate.getTime()
      } else if (aDate && !bDate) {
        return -1
      } else if (!aDate && bDate) {
        return 1
      }

      // Third: by priority (High > Medium > Low)
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
      const aPriority = priorityOrder[a.priority || 'Medium']
      const bPriority = priorityOrder[b.priority || 'Medium']
      
      return bPriority - aPriority
    })
  }

  // Toggle todo completion
  const toggleTodo = async (todo: UnifiedTodo) => {
    try {
      const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
      
      if (todo.source === 'building_todos') {
        // Update in building_todos table
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

        setTodos(prev => prev.map(t => 
          t.id === todo.id ? { ...t, status: newStatus, is_complete: newStatus === 'completed' } : t
        ))
      } else if (todo.source === 'building_tasks') {
        // Update in building_tasks table
        const response = await fetch(`/api/building-tasks/${todo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus === 'completed' ? 'Complete' : 'In Progress'
          })
        })

        if (!response.ok) {
          console.error('Error updating task')
          return
        }

        setTasks(prev => prev.map(t => 
          t.id === todo.id ? { ...t, status: newStatus === 'completed' ? 'Complete' : 'In Progress' } : t
        ))
      }

      // Refresh summary after update
      fetchSummary()
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }

  // Add new todo
  const addTodo = async () => {
    if (!newTodo.title.trim()) return

    try {
      const response = await fetch('/api/create-building-todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          title: newTodo.title.trim(),
          due_date: newTodo.due_date || null,
          priority: newTodo.priority
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error adding todo:', errorData)
        return
      }

      const { todo } = await response.json()
      const todoWithSource = { ...todo, source: 'building_todos' as const }
      setTodos(prev => [todoWithSource, ...prev])
      setNewTodo({ title: '', due_date: '', priority: 'Medium' })
      setShowAddModal(false)
      fetchSummary()
    } catch (error) {
      console.error('Error adding todo:', error)
    }
  }

  // Update todo
  const updateTodo = async () => {
    if (!editingTodo || !editingTodo.title.trim()) return

    try {
      if (editingTodo.source === 'building_todos') {
        // Update in building_todos table
        const { error } = await supabase
          .from('building_todos')
          .update({
            title: editingTodo.title.trim(),
            due_date: editingTodo.due_date || null,
            priority: editingTodo.priority
          })
          .eq('id', editingTodo.id)

        if (error) {
          console.error('Error updating todo:', error)
          return
        }

        setTodos(prev => prev.map(t => 
          t.id === editingTodo.id ? editingTodo : t
        ))
      } else if (editingTodo.source === 'building_tasks') {
        // Update in building_tasks table
        const response = await fetch(`/api/building-tasks/${editingTodo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: editingTodo.title.trim(),
            due_date: editingTodo.due_date || null,
            priority: editingTodo.priority === 'High' ? 'High' : 
                     editingTodo.priority === 'Medium' ? 'Medium' : 'Low'
          })
        })

        if (!response.ok) {
          console.error('Error updating task')
          return
        }

        setTasks(prev => prev.map(t => 
          t.id === editingTodo.id ? {
            ...t,
            task: editingTodo.title.trim(),
            due_date: editingTodo.due_date || null,
            priority: editingTodo.priority === 'High' ? 'High' : 
                     editingTodo.priority === 'Medium' ? 'Medium' : 'Low'
          } : t
        ))
      }

      setEditingTodo(null)
      fetchSummary()
    } catch (error) {
      console.error('Error updating todo:', error)
    }
  }

  // Delete todo
  const deleteTodo = async (id: string, source: 'building_todos' | 'building_tasks') => {
    try {
      if (source === 'building_todos') {
        // Delete from building_todos table
        const { error } = await supabase
          .from('building_todos')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Error deleting todo:', error)
          return
        }

        setTodos(prev => prev.filter(t => t.id !== id))
      } else if (source === 'building_tasks') {
        // Delete from building_tasks table
        const response = await fetch(`/api/building-tasks/${id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          console.error('Error deleting task')
          return
        }

        setTasks(prev => prev.filter(t => t.id !== id))
      }

      setDeleteConfirmTodo(null)
      fetchSummary()
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

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
  const isOverdue = (todo: UnifiedTodo) => {
    if (!todo.due_date || todo.status === 'completed') return false
    return new Date(todo.due_date) < new Date()
  }

  const sortedAndFilteredTodos = getSortedAndFilteredTodos()
  const allItems = getAllItems()

  return (
    <div className="space-y-6">
      {/* To-Do List Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">📝 Building To-Do List</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSummary}
              disabled={summaryLoading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Brain className={`h-4 w-4 ${summaryLoading ? 'animate-spin' : ''}`} />
              Summarise Tasks
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          <div className="flex gap-2">
            {(['All', 'Pending', 'In Progress', 'Completed'] as FilterType[]).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filter === filterType
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterType}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500">
            {sortedAndFilteredTodos.length} of {allItems.length} tasks
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-gray-500">Loading tasks...</p>
          </div>
        ) : sortedAndFilteredTodos.length > 0 ? (
          <div className="space-y-3">
            {sortedAndFilteredTodos.map((todo) => (
              <div
                key={`${todo.source}-${todo.id}`}
                className={`flex items-center gap-3 p-4 border rounded-lg transition-all duration-200 ${
                  todo.status === 'completed'
                    ? 'bg-gray-50 border-gray-200' 
                    : isOverdue(todo)
                    ? 'bg-red-50 border-red-200'
                    : todo.status === 'in_progress'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200 hover:border-teal-300'
                }`}
              >
                {/* Completion checkbox */}
                <button
                  onClick={() => toggleTodo(todo)}
                  className="flex-shrink-0 transition-all duration-200 hover:scale-110"
                >
                  {todo.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 hover:text-teal-600" />
                  )}
                </button>

                {/* Task content */}
                <div className="flex-1 min-w-0">
                  {editingTodo?.id === todo.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingTodo.title}
                        onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={editingTodo.due_date || ''}
                          onChange={(e) => setEditingTodo({ ...editingTodo, due_date: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <select
                          value={editingTodo.priority}
                          onChange={(e) => setEditingTodo({ ...editingTodo, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className={`font-medium ${todo.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {todo.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        {todo.priority && (
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(todo.priority)}`}>
                            📌 {todo.priority}
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full border ${
                          todo.status === 'completed' ? 'text-green-600 bg-green-100 border-green-200' :
                          todo.status === 'in_progress' ? 'text-blue-600 bg-blue-100 border-blue-200' :
                          'text-gray-600 bg-gray-100 border-gray-200'
                        }`}>
                          {todo.status === 'completed' ? '✅ Completed' :
                           todo.status === 'in_progress' ? '🔄 In Progress' :
                           '⏳ Pending'}
                        </span>
                        {todo.assigned_to && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <User className="h-3 w-3" />
                            {todo.assigned_to}
                          </div>
                        )}
                        {todo.due_date && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(todo.due_date).toLocaleDateString()}
                            {isOverdue(todo) && (
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        )}
                        {todo.source === 'building_tasks' && (
                          <span className="px-2 py-1 text-xs rounded-full border text-purple-600 bg-purple-100 border-purple-200">
                            📋 Task
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {editingTodo?.id === todo.id ? (
                    <>
                      <button
                        onClick={updateTodo}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingTodo(null)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <AIButton
                        contextType="todo"
                        itemId={todo.id}
                        itemTitle={todo.title}
                        buildingId={buildingId.toString()}
                        className="p-2"
                      />
                      <button
                        onClick={() => setEditingTodo(todo)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmTodo(todo)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'All' ? 'No tasks yet' : `No ${filter.toLowerCase()} tasks`}
            </h3>
            <p className="text-gray-500">
              {filter === 'All' ? 'Add your first task to get started!' : `All tasks are ${filter === 'Completed' ? 'completed' : 'incomplete'}.`}
            </p>
          </div>
        )}
      </div>

      {/* Weekly Summary Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">📋 Weekly Summary</h2>
          <button
            onClick={fetchSummary}
            disabled={summaryLoading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${summaryLoading ? 'animate-spin' : ''}`} />
            Refresh Summary
          </button>
        </div>

        {summaryLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-gray-500">Generating summary...</p>
          </div>
        ) : summary ? (
          <div className="space-y-4">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Completed This Week</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">✅ {summary.statistics.completedThisWeek}</p>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Overdue Tasks</span>
                </div>
                <p className="text-2xl font-bold text-red-900 mt-1">⏳ {summary.statistics.overdueTasks}</p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Completion Rate</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-1">💬 {summary.statistics.completionRate}%</p>
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-teal-600 mt-0.5" />
                <div className="flex-1">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{summary.summary}</pre>
                  <p className="text-xs text-gray-500 mt-2">
                    Last updated: {new Date(summary.lastUpdated).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No summary available</h3>
            <p className="text-gray-500">Add some tasks to generate a summary.</p>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ease-in-out">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Task</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Task Title *
                </label>
                <input
                  type="text"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter task title..."
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📌 Priority
                </label>
                <select
                  value={newTodo.priority}
                  onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🗓 Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newTodo.due_date}
                  onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addTodo}
                disabled={!newTodo.title.trim()}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTodo && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ease-in-out">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
              <button
                onClick={() => setDeleteConfirmTodo(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete the task "{deleteConfirmTodo.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmTodo(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTodo(deleteConfirmTodo.id, deleteConfirmTodo.source!)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 