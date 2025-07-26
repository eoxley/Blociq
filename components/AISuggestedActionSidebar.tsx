'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  Lightbulb, 
  Plus, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Loader2
} from 'lucide-react'

type SuggestedAction = {
  type: 'todo';
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date?: string | null;
  description?: string;
}

interface AISuggestedActionSidebarProps {
  suggestedAction: SuggestedAction | null;
  buildingId: number;
  onTaskCreated?: () => void;
  onDismiss?: () => void;
}

export default function AISuggestedActionSidebar({ 
  suggestedAction, 
  buildingId, 
  onTaskCreated,
  onDismiss 
}: AISuggestedActionSidebarProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  if (!suggestedAction || isDismissed) {
    return null
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100 border-red-200'
      case 'Medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'Low': return 'text-green-600 bg-green-100 border-green-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'High': return <AlertTriangle className="h-4 w-4" />
      case 'Medium': return <Calendar className="h-4 w-4" />
      case 'Low': return <CheckCircle className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  const createTaskFromSuggestion = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/create-task-from-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestedAction,
          buildingId
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Task created successfully:', result)
        
        // Call the callback to refresh the todo list
        if (onTaskCreated) {
          onTaskCreated()
        }
        
        // Dismiss the sidebar
        setIsDismissed(true)
        if (onDismiss) {
          onDismiss()
        }
      } else {
        console.error('Failed to create task')
      }
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    if (onDismiss) {
      onDismiss()
    }
  }

  return (
    <div className="fixed right-4 top-20 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900">AI Suggestion</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Task Details */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">{suggestedAction.title}</h4>
            {suggestedAction.description && (
              <p className="text-sm text-gray-600">{suggestedAction.description}</p>
            )}
          </div>

          {/* Priority Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full border flex items-center gap-1 ${getPriorityColor(suggestedAction.priority)}`}>
              {getPriorityIcon(suggestedAction.priority)}
              {suggestedAction.priority} Priority
            </span>
          </div>

          {/* Due Date */}
          {suggestedAction.due_date && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Due: {new Date(suggestedAction.due_date).toLocaleDateString()}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={createTaskFromSuggestion}
              disabled={isCreating}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isCreating ? 'Creating...' : 'Add Task'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 