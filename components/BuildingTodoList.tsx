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
  Edit3,
  Shield,
  FileText
} from 'lucide-react'
import { BlocIQCard, BlocIQCardContent } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { toast } from 'sonner'

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

type ComplianceItem = {
  id: string
  building_id: string
  compliance_asset_id: string
  status: 'pending' | 'compliant' | 'overdue' | 'due_soon'
  next_due_date?: string
  notes?: string
  building?: {
    name: string
  }
  compliance_assets: {
    name: string
    category: string
    description?: string
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
  onEmptyState?: (isEmpty: boolean) => void
  includeCompliance?: boolean
}

export default function BuildingTodoList({ 
  className = "", 
  maxItems = 5,
  showBuildingName = true,
  onEmptyState,
  includeCompliance = true
}: BuildingTodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddTaskForm, setShowAddTaskForm] = useState(false)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [activeTab, setActiveTab] = useState<'todos' | 'compliance'>('todos')

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
      
      if (error) throw error
      setBuildings(data || [])
    } catch (error) {
      console.error('Error fetching buildings:', error)
    }
  }

  // Fetch todos
  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('building_todos')
        .select(`
          *,
          building:buildings(name)
        `)
        .order('created_at', { ascending: false })
        .limit(maxItems)
      
      if (error) throw error
      
      setTodos(data || [])
      
      // Notify parent about empty state
      if (onEmptyState) {
        onEmptyState((data || []).length === 0)
      }
    } catch (error) {
      console.error('Error fetching todos:', error)
      setError('Failed to load tasks')
    }
  }

  // Fetch upcoming compliance items
  const fetchComplianceItems = async () => {
    if (!includeCompliance) return

    try {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { data, error } = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          building:buildings(name),
          compliance_assets(name, category, description)
        `)
        .not('next_due_date', 'is', null)
        .lte('next_due_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('next_due_date', { ascending: true })
        .limit(maxItems)
      
      if (error) {
        console.error('Error fetching compliance items:', error)
        // Don't throw - just set empty array and continue
        setComplianceItems([])
        return
      }
      
      setComplianceItems(data || [])
    } catch (error) {
      console.error('Error fetching compliance items:', error)
      // Set empty array on error to prevent infinite loading
      setComplianceItems([])
    }
  }

  // Toggle todo completion
  const toggleTodo = async (todo: Todo) => {
    try {
      const newStatus = todo.is_complete ? 'pending' : 'completed'
      const { error } = await supabase
        .from('building_todos')
        .update({ 
          is_complete: !todo.is_complete,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', todo.id)

      if (error) throw error

      // Update local state
      setTodos(prev => prev.map(t => 
        t.id === todo.id 
          ? { ...t, is_complete: !t.is_complete, status: newStatus }
          : t
      ))

      toast.success(`Task ${todo.is_complete ? 'reopened' : 'completed'}`)
    } catch (error) {
      console.error('Error toggling todo:', error)
      toast.error('Failed to update task')
    }
  }

  // Add new task
  const addNewTask = async () => {
    if (!newTask.title.trim() || !newTask.building_id) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsAddingTask(true)
    try {
      const { data, error } = await supabase
        .from('building_todos')
        .insert({
          title: newTask.title,
          description: newTask.description,
          building_id: parseInt(newTask.building_id),
          due_date: newTask.due_date || null,
          priority: newTask.priority,
          assigned_to: newTask.assigned_to || null,
          status: 'pending',
          is_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) throw error

      // Reset form and refresh todos
      setNewTask({
        title: '',
        description: '',
        building_id: '',
        due_date: '',
        priority: 'Medium',
        assigned_to: ''
      })
      setShowAddTaskForm(false)
      fetchTodos()
      toast.success('Task added successfully')
    } catch (error) {
      console.error('Error adding task:', error)
      toast.error('Failed to add task')
    } finally {
      setIsAddingTask(false)
    }
  }

  // Delete task
  const handleDeleteTask = async (todoId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const { error } = await supabase
        .from('building_todos')
        .delete()
        .eq('id', todoId)

      if (error) throw error

      setTodos(prev => prev.filter(t => t.id !== todoId))
      toast.success('Task deleted successfully')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  // Helper functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = (todo: Todo) => {
    if (!todo.due_date) return false
    return new Date(todo.due_date) < new Date() && todo.status !== 'completed'
  }

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate)
    const today = new Date()
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

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'due_soon': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load all data in parallel
        await Promise.allSettled([
          fetchBuildings(),
          fetchTodos(),
          fetchComplianceItems()
        ])
        
        // Set loading to false regardless of success/failure
        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setError('Failed to load some data')
        setLoading(false)
      }
    }
    
    loadData()
  }, [maxItems, includeCompliance])

  // Fake placeholder data for demo purposes - using fixed dates for SSR compatibility
  const fakeTodos: Todo[] = [
    {
      id: 'fake-1',
      building_id: 1,
      title: 'Schedule annual fire safety inspection',
      description: 'Arrange for qualified inspector to conduct fire safety assessment',
      status: 'pending',
      is_complete: false,
      due_date: '2024-08-15T00:00:00.000Z', // Fixed date instead of Date.now()
      priority: 'High',
      assigned_to: 'John Smith',
      created_by: 'admin',
      created_at: '2024-08-01T00:00:00.000Z', // Fixed date instead of new Date()
      updated_at: '2024-08-01T00:00:00.000Z', // Fixed date instead of new Date()
      building: { name: 'Ashwood House' }
    },
    {
      id: 'fake-2',
      building_id: 1,
      title: 'Replace broken window in unit 3B',
      description: 'Window frame damaged, needs replacement',
      status: 'in_progress',
      is_complete: false,
      due_date: '2024-08-10T00:00:00.000Z', // Fixed date instead of Date.now()
      priority: 'Medium',
      assigned_to: 'Maintenance Team',
      created_by: 'admin',
      created_at: '2024-08-01T00:00:00.000Z', // Fixed date instead of new Date()
      updated_at: '2024-08-01T00:00:00.000Z', // Fixed date instead of new Date()
      building: { name: 'Ashwood House' }
    },
    {
      id: 'fake-3',
      building_id: 2,
      title: 'Review service charge accounts',
      description: 'Annual service charge review and distribution',
      status: 'pending',
      is_complete: false,
      due_date: '2024-08-20T00:00:00.000Z', // Fixed date instead of Date.now()
      priority: 'Medium',
      assigned_to: 'Finance Team',
      created_by: 'admin',
      created_at: '2024-08-01T00:00:00.000Z', // Fixed date instead of new Date()
      updated_at: '2024-08-01T00:00:00.000Z', // Fixed date instead of new Date()
      building: { name: 'Riverside Court' }
    }
  ]

  const fakeComplianceItems: ComplianceItem[] = [
    {
      id: 'fake-comp-1',
      building_id: '1',
      compliance_asset_id: '1',
      status: 'overdue',
      next_due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Fire risk assessment overdue',
      building: { name: 'Ashwood House' },
      compliance_assets: {
        name: 'Fire Risk Assessment',
        category: 'Fire Safety',
        description: 'Annual fire safety assessment required by law'
      }
    },
    {
      id: 'fake-comp-2',
      building_id: '1',
      compliance_asset_id: '2',
      status: 'due_soon',
      next_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Gas safety certificate due soon',
      building: { name: 'Ashwood House' },
      compliance_assets: {
        name: 'Gas Safety Certificate',
        category: 'Gas Safety',
        description: 'Annual gas safety inspection certificate'
      }
    },
    {
      id: 'fake-comp-3',
      building_id: '2',
      compliance_asset_id: '3',
      status: 'pending',
      next_due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Electrical installation certificate',
      building: { name: 'Riverside Court' },
      compliance_assets: {
        name: 'Electrical Installation Certificate',
        category: 'Electrical',
        description: 'EICR certificate every 5 years'
      }
    }
  ]

  if (loading) {
    return (
      <div className={`h-full ${className}`}>
        <div className="bg-white rounded-2xl shadow-lg border-0 p-6 h-full">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0F5D5D] mx-auto mb-4" />
              <p className="text-gray-600">Loading building tasks...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Use fake data if no real data is available
  const displayTodos = todos.length > 0 ? todos : fakeTodos
  const displayComplianceItems = complianceItems.length > 0 ? complianceItems : fakeComplianceItems
  const totalItems = displayTodos.length + displayComplianceItems.length
  const hasItems = totalItems > 0

  return (
    <div className={`h-full ${className}`}>
      <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Building To-Do</h2>
                <p className="text-white/80 text-sm">Tasks & Compliance</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddTaskForm(!showAddTaskForm)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'todos' 
                  ? 'bg-white text-[#4f46e5]' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              Tasks
            </button>
            {includeCompliance && (
              <button
                onClick={() => setActiveTab('compliance')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'compliance' 
                    ? 'bg-white text-[#4f46e5]' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                Compliance
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Add Task Form */}
          {showAddTaskForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building *</label>
                  <select
                    value={newTask.building_id}
                    onChange={(e) => setNewTask(prev => ({ ...prev, building_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
                  >
                    <option value="">Select building</option>
                    {buildings.map(building => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as 'Low' | 'Medium' | 'High' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
                  placeholder="Enter task description"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addNewTask}
                  disabled={isAddingTask}
                  className="px-4 py-2 bg-[#0F5D5D] text-white rounded-lg hover:bg-[#0A4A4A] transition-colors disabled:opacity-50"
                >
                  {isAddingTask ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowAddTaskForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'todos' && (
            <div>
              {displayTodos.length > 0 ? (
                <div className="space-y-3">
                  {displayTodos.map(todo => (
                    <div
                      key={todo.id}
                      className={`p-4 rounded-lg border transition-all ${
                        todo.is_complete 
                          ? 'bg-gray-50 border-gray-200' 
                          : isOverdue(todo)
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTodo(todo)}
                          className="mt-1 flex-shrink-0"
                        >
                          {todo.is_complete ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400 hover:text-[#0F5D5D]" />
                          )}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className={`font-medium ${
                              todo.is_complete ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}>
                              {todo.title}
                            </h3>
                            {todo.priority && (
                              <BlocIQBadge className={`text-xs ${getPriorityColor(todo.priority)}`}>
                                {todo.priority}
                              </BlocIQBadge>
                            )}
                            {isOverdue(todo) && (
                              <BlocIQBadge className="bg-red-100 text-red-800 text-xs">
                                Overdue
                              </BlocIQBadge>
                            )}
                          </div>
                          
                          {todo.description && (
                            <p className={`text-sm mb-2 ${
                              todo.is_complete ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {todo.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {showBuildingName && todo.building && (
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {todo.building.name}
                              </span>
                            )}
                            {todo.due_date && (
                              <span className={`flex items-center gap-1 ${
                                isOverdue(todo) ? 'text-red-600' : 'text-gray-500'
                              }`}>
                                <Calendar className="h-3 w-3" />
                                {formatDueDate(todo.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteTask(todo.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Circle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No tasks found</p>
                </div>
              )}
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && includeCompliance && (
            <div>
              {displayComplianceItems.length > 0 ? (
                <div className="space-y-3">
                  {displayComplianceItems.map(item => {
                    const daysUntilDue = getDaysUntilDue(item.next_due_date!)
                    const isOverdue = daysUntilDue < 0
                    const isDueSoon = daysUntilDue <= 30 && daysUntilDue >= 0
                    
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border transition-all ${
                          isOverdue
                            ? 'bg-red-50 border-red-200'
                            : isDueSoon
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex-shrink-0">
                            <Shield className={`h-5 w-5 ${
                              isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-gray-400'
                            }`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-gray-900">
                                {item.compliance_assets.name}
                              </h3>
                              <BlocIQBadge className={`text-xs ${getComplianceStatusColor(item.status)}`}>
                                {item.status.replace('_', ' ')}
                              </BlocIQBadge>
                              {isOverdue && (
                                <BlocIQBadge className="bg-red-100 text-red-800 text-xs">
                                  Overdue
                                </BlocIQBadge>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {item.compliance_assets.description || 'No description available'}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {showBuildingName && item.building && (
                                <span className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {item.building.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {item.compliance_assets.category}
                              </span>
                              {item.next_due_date && (
                                <span className={`flex items-center gap-1 ${
                                  isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-gray-500'
                                }`}>
                                  <Calendar className="h-3 w-3" />
                                  {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` :
                                   daysUntilDue === 0 ? 'Due today' :
                                   daysUntilDue === 1 ? 'Due tomorrow' :
                                   `Due in ${daysUntilDue} days`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No upcoming compliance items</p>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!hasItems && (
            <div className="text-center py-8">
              <Building className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No items to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}