'use client'

import React from 'react'
import EditableBuildingInfo from './EditableBuildingInfo'

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

interface BuildingInfoClientProps {
  building: BuildingInfo
}

export default function BuildingInfoClient({ building }: BuildingInfoClientProps) {
  const handleUpdate = async (updatedBuilding: Partial<BuildingInfo>) => {
    try {
      console.log('🔍 Updating building:', building.id)
      console.log('📝 Update data:', updatedBuilding)
      
      const response = await fetch(`/api/buildings/${building.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedBuilding),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Building update failed:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to update building')
      }

      const result = await response.json()
      
      // Optionally refresh the page to show updated data
      // window.location.reload()
      
      return result
    } catch (error) {
      console.error('Error updating building:', error)
      throw error
    }
  }

  return (
    <EditableBuildingInfo 
      building={building} 
      onUpdate={handleUpdate} 
    />
  )
} 