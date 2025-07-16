'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Save, X, Key, Users, Car, Building } from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface BuildingInfoProps {
  buildingId: string
}

interface BuildingInfoData {
  access_notes?: string
  sites_staff?: string
  parking_info?: string
  council_borough?: string
}

export default function BuildingInfo({ buildingId }: BuildingInfoProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfoData>({})
  const [editedInfo, setEditedInfo] = useState<BuildingInfoData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchBuildingInfo()
  }, [buildingId])

  const fetchBuildingInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('access_notes, sites_staff, parking_info, council_borough')
        .eq('id', buildingId)
        .single()

      if (error) {
        console.error('Error fetching building info:', error)
      } else {
        const info = {
          access_notes: data?.access_notes || '',
          sites_staff: data?.sites_staff || '',
          parking_info: data?.parking_info || '',
          council_borough: data?.council_borough || ''
        }
        setBuildingInfo(info)
        setEditedInfo(info)
      }
    } catch (error) {
      console.error('Error fetching building info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('buildings')
        .update(editedInfo)
        .eq('id', buildingId)

      if (error) {
        console.error('Error updating building info:', error)
      } else {
        setBuildingInfo(editedInfo)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving building info:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedInfo(buildingInfo)
    setIsEditing(false)
  }

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">🏢 Building Information</h2>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Access Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Key className="h-4 w-4 text-teal-600" />
              Access Information
            </div>
            {isEditing ? (
              <textarea
                value={editedInfo.access_notes || ''}
                onChange={(e) => setEditedInfo({...editedInfo, access_notes: e.target.value})}
                placeholder="Enter access information (entry codes, key collection, etc.)"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg min-h-[60px]">
                {buildingInfo.access_notes || 'No access information available'}
              </p>
            )}
          </div>

          {/* Sites Staff */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4 text-teal-600" />
              Sites Staff
            </div>
            {isEditing ? (
              <textarea
                value={editedInfo.sites_staff || ''}
                onChange={(e) => setEditedInfo({...editedInfo, sites_staff: e.target.value})}
                placeholder="Enter sites staff information (concierge, cleaners, etc.)"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg min-h-[60px]">
                {buildingInfo.sites_staff || 'No sites staff information available'}
              </p>
            )}
          </div>

          {/* Parking Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Car className="h-4 w-4 text-teal-600" />
              Parking Information
            </div>
            {isEditing ? (
              <textarea
                value={editedInfo.parking_info || ''}
                onChange={(e) => setEditedInfo({...editedInfo, parking_info: e.target.value})}
                placeholder="Enter parking information (permits, visitor parking, etc.)"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg min-h-[60px]">
                {buildingInfo.parking_info || 'No parking information available'}
              </p>
            )}
          </div>

          {/* Council Borough */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building className="h-4 w-4 text-teal-600" />
              Council Borough
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editedInfo.council_borough || ''}
                onChange={(e) => setEditedInfo({...editedInfo, council_borough: e.target.value})}
                placeholder="Enter council borough"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            ) : (
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                {buildingInfo.council_borough || 'No council borough information available'}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 