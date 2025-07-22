'use client'

import React, { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import { 
  Flag, 
  AlertTriangle, 
  Wrench, 
  Shield, 
  MessageSquare, 
  PoundSterling, 
  FileText, 
  X,
  Check,
  Clock,
  Calendar,
  Archive,
  Eye,
  FolderOpen
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'

interface EmailContextMenuProps {
  emailId: string
  currentTags: string[] | null
  isVisible: boolean
  position: { x: number; y: number }
  onClose: () => void
  onTagsUpdated?: () => void
  emailFiled?: boolean
  outlookId?: string | null
}

const TRIAGE_CATEGORIES = [
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    urgency: 'medium'
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: Shield,
    color: 'bg-red-100 text-red-700 border-red-200',
    urgency: 'high'
  },
  {
    id: 'complaint',
    label: 'Complaint',
    icon: MessageSquare,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    urgency: 'high'
  },
  {
    id: 'service_charge',
    label: 'Service Charge',
    icon: PoundSterling,
    color: 'bg-green-100 text-green-700 border-green-200',
    urgency: 'medium'
  },
  {
    id: 'general',
    label: 'General',
    icon: FileText,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    urgency: 'low'
  },
  {
    id: 'urgent',
    label: 'Urgent',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 border-red-200',
    urgency: 'critical'
  }
]

const URGENCY_LEVELS = [
  {
    id: 'critical',
    label: 'Critical',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 border-red-200'
  },
  {
    id: 'high',
    label: 'High',
    icon: Clock,
    color: 'bg-orange-100 text-orange-700 border-orange-200'
  },
  {
    id: 'medium',
    label: 'Medium',
    icon: Calendar,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  },
  {
    id: 'low',
    label: 'Low',
    icon: Archive,
    color: 'bg-gray-100 text-gray-700 border-gray-200'
  }
]

export default function EmailContextMenu({ 
  emailId, 
  currentTags, 
  isVisible, 
  position, 
  onClose, 
  onTagsUpdated,
  emailFiled = false,
  outlookId
}: EmailContextMenuProps) {
  const supabase = createClientComponentClient()
  const [updating, setUpdating] = useState(false)
  const [filing, setFiling] = useState(false)

  const updateEmailTags = async (newTags: string[]) => {
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('incoming_emails')
        .update({ tags: newTags })
        .eq('id', emailId)

      if (error) {
        throw error
      }

      toast.success('Email flagged successfully')
      onTagsUpdated?.()
    } catch (error) {
      console.error('Error updating email tags:', error)
      toast.error('Failed to flag email')
    } finally {
      setUpdating(false)
    }
  }

  const handleCategoryClick = (category: string) => {
    const newTags = currentTags ? [...currentTags] : []
    
    // Remove any existing category tags
    const filteredTags = newTags.filter(tag => 
      !TRIAGE_CATEGORIES.some(cat => cat.id === tag)
    )
    
    // Add the new category
    filteredTags.push(category)
    
    updateEmailTags(filteredTags)
    onClose()
  }

  const handleUrgencyClick = (urgency: string) => {
    const newTags = currentTags ? [...currentTags] : []
    
    // Remove any existing urgency tags
    const filteredTags = newTags.filter(tag => 
      !URGENCY_LEVELS.some(level => level.id === tag)
    )
    
    // Add the new urgency
    filteredTags.push(urgency)
    
    updateEmailTags(filteredTags)
    onClose()
  }

  const removeTag = (tagToRemove: string) => {
    const newTags = currentTags ? currentTags.filter(tag => tag !== tagToRemove) : []
    updateEmailTags(newTags)
  }

  const handleFileEmail = async () => {
    if (filing) return;
    
    setFiling(true);
    try {
      const response = await fetch('/api/email/file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_id: emailId,
          outlook_id: outlookId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to file email');
      }

      toast.success('Email filed successfully');
      onClose();
      
      // Trigger a refresh of the email list
      if (onTagsUpdated) {
        onTagsUpdated();
      }
    } catch (error) {
      console.error('Error filing email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to file email');
    } finally {
      setFiling(false);
    }
  };

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Context Menu */}
      <div 
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-64 max-w-80"
        style={{
          left: Math.min(position.x, window.innerWidth - 280),
          top: Math.min(position.y, window.innerHeight - 400)
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Flag Email</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Tags */}
        {currentTags && currentTags.length > 0 && (
          <div className="p-3 border-b border-gray-200">
            <div className="text-xs font-medium text-gray-700 mb-2">Current Tags:</div>
            <div className="flex flex-wrap gap-1">
              {currentTags.map((tag) => {
                const category = TRIAGE_CATEGORIES.find(cat => cat.id === tag)
                const urgency = URGENCY_LEVELS.find(level => level.id === tag)
                const config = category || urgency
                
                return (
                  <div
                    key={tag}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${config?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                  >
                    <span>{config?.label || tag}</span>
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="p-3 border-b border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">Categories:</div>
          <div className="space-y-1">
            {TRIAGE_CATEGORIES.map((category) => {
              const Icon = category.icon
              const isSelected = currentTags?.includes(category.id)
              
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  disabled={updating}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                    isSelected 
                      ? `${category.color} border` 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{category.label}</span>
                  {isSelected && <Check className="h-3 w-3 ml-auto" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Urgency Levels */}
        <div className="p-3 border-b border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">Urgency:</div>
          <div className="space-y-1">
            {URGENCY_LEVELS.map((level) => {
              const Icon = level.icon
              const isSelected = currentTags?.includes(level.id)
              
              return (
                <button
                  key={level.id}
                  onClick={() => handleUrgencyClick(level.id)}
                  disabled={updating}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                    isSelected 
                      ? `${level.color} border` 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{level.label}</span>
                  {isSelected && <Check className="h-3 w-3 ml-auto" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* File Action */}
        {!emailFiled && (
          <div className="p-3">
            <div className="text-xs font-medium text-gray-700 mb-2">Actions:</div>
            <button
              onClick={handleFileEmail}
              disabled={filing}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-blue-50 text-blue-700 border border-blue-200"
            >
              <FolderOpen className="h-3 w-3" />
              <span>{filing ? 'Filing...' : 'File Email'}</span>
            </button>
          </div>
        )}

        {emailFiled && (
          <div className="p-3">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200">
              <Check className="h-3 w-3" />
              <span>Email Filed</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {updating && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              Updating...
            </div>
          </div>
        )}
      </div>
    </>
  )
} 