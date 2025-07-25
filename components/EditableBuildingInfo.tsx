'use client'

import React, { useState } from 'react'
import { 
  BookOpen, 
  Key, 
  Car, 
  Phone, 
  Zap, 
  Calendar,
  Edit3,
  Save,
  X,
  Loader2
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { toast } from 'sonner'

interface BuildingInfo {
  id: string
  name: string
  address: string
  notes?: string
  key_access_notes?: string
  parking_notes?: string
  entry_code?: string
  fire_panel_location?: string
  created_at: string
}

interface EditableBuildingInfoProps {
  building: BuildingInfo
  onUpdate: (updatedBuilding: Partial<BuildingInfo>) => Promise<void>
}

export default function EditableBuildingInfo({ building, onUpdate }: EditableBuildingInfoProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    notes: building.notes || '',
    key_access_notes: building.key_access_notes || '',
    parking_notes: building.parking_notes || '',
    entry_code: building.entry_code || '',
    fire_panel_location: building.fire_panel_location || ''
  })

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFormData({
      notes: building.notes || '',
      key_access_notes: building.key_access_notes || '',
      parking_notes: building.parking_notes || '',
      entry_code: building.entry_code || '',
      fire_panel_location: building.fire_panel_location || ''
    })
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate(formData)
      setIsEditing(false)
      toast.success('Building information updated successfully!')
    } catch (error) {
      console.error('Error updating building:', error)
      toast.error('Failed to update building information')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const renderField = (
    icon: React.ReactNode,
    title: string,
    field: keyof typeof formData,
    placeholder?: string,
    type: 'text' | 'textarea' = 'text'
  ) => {
    const value = formData[field]
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
            {icon}
          </div>
          <span className="text-lg font-semibold text-gray-900">{title}</span>
        </div>
        
        {isEditing ? (
          type === 'textarea' ? (
            <textarea
              value={value}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={placeholder || `Enter ${title.toLowerCase()}`}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              rows={3}
            />
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={placeholder || `Enter ${title.toLowerCase()}`}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          )
        ) : (
          <p className="text-gray-700 leading-relaxed">
            {value || <span className="text-gray-400 italic">No information provided</span>}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Building Information</h3>
            <p className="text-gray-600">Key details and operational information</p>
          </div>
        </div>
        
        {!isEditing ? (
          <BlocIQButton
            onClick={handleEdit}
            size="sm"
            variant="outline"
            className="text-teal-600 border-teal-600 hover:bg-teal-50"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </BlocIQButton>
        ) : (
          <div className="flex items-center gap-2">
            <BlocIQButton
              onClick={handleCancel}
              size="sm"
              variant="outline"
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </BlocIQButton>
            <BlocIQButton
              onClick={handleSave}
              size="sm"
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </BlocIQButton>
          </div>
        )}
      </div>

      {/* Building Information Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {renderField(
          <BookOpen className="h-5 w-5 text-white" />,
          'Notes',
          'notes',
          'Enter building notes and general information...',
          'textarea'
        )}
        
        {renderField(
          <Key className="h-5 w-5 text-white" />,
          'Key Access',
          'key_access_notes',
          'Enter key access information and procedures...',
          'textarea'
        )}
        
        {renderField(
          <Car className="h-5 w-5 text-white" />,
          'Parking',
          'parking_notes',
          'Enter parking information and restrictions...',
          'textarea'
        )}
        
        {renderField(
          <Phone className="h-5 w-5 text-white" />,
          'Entry Code',
          'entry_code',
          'Enter building entry code'
        )}
        
        {renderField(
          <Zap className="h-5 w-5 text-white" />,
          'Fire Panel',
          'fire_panel_location',
          'Enter fire panel location'
        )}
        
        {/* Read-only Created Date */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Added</span>
          </div>
          <p className="text-gray-700 text-lg">
            {new Date(building.created_at).toLocaleDateString('en-GB')}
          </p>
        </div>
      </div>
    </div>
  )
} 