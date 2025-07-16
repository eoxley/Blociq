'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Save, X, Key, Users, Car, Building, Plus, Phone, Mail, Calendar, Wrench, Shield, FileText } from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'

interface BuildingInfoProps {
  buildingId: string
}

interface BuildingInfoData {
  access_notes?: string
  sites_staff?: string
  parking_info?: string
  council_borough?: string
  building_manager_name?: string
  building_manager_email?: string
  building_manager_phone?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  building_age?: string
  construction_type?: string
  total_floors?: string
  lift_available?: string
  heating_type?: string
  hot_water_type?: string
  waste_collection_day?: string
  recycling_info?: string
  building_insurance_provider?: string
  building_insurance_expiry?: string
  fire_safety_status?: string
  asbestos_status?: string
  energy_rating?: string
  service_charge_frequency?: string
  ground_rent_amount?: string
  ground_rent_frequency?: string
}

export default function BuildingInfo({ buildingId }: BuildingInfoProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfoData>({})
  const [editedInfo, setEditedInfo] = useState<BuildingInfoData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdditionalFields, setShowAdditionalFields] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchBuildingInfo()
  }, [buildingId])

  const fetchBuildingInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single()

      if (error) {
        console.error('Error fetching building info:', error)
        toast.error('Failed to load building information')
      } else {
        const info = {
          access_notes: data?.access_notes || '',
          sites_staff: data?.sites_staff || '',
          parking_info: data?.parking_info || '',
          council_borough: data?.council_borough || '',
          building_manager_name: data?.building_manager_name || '',
          building_manager_email: data?.building_manager_email || '',
          building_manager_phone: data?.building_manager_phone || '',
          emergency_contact_name: data?.emergency_contact_name || '',
          emergency_contact_phone: data?.emergency_contact_phone || '',
          building_age: data?.building_age || '',
          construction_type: data?.construction_type || '',
          total_floors: data?.total_floors || '',
          lift_available: data?.lift_available || '',
          heating_type: data?.heating_type || '',
          hot_water_type: data?.hot_water_type || '',
          waste_collection_day: data?.waste_collection_day || '',
          recycling_info: data?.recycling_info || '',
          building_insurance_provider: data?.building_insurance_provider || '',
          building_insurance_expiry: data?.building_insurance_expiry || '',
          fire_safety_status: data?.fire_safety_status || '',
          asbestos_status: data?.asbestos_status || '',
          energy_rating: data?.energy_rating || '',
          service_charge_frequency: data?.service_charge_frequency || '',
          ground_rent_amount: data?.ground_rent_amount || '',
          ground_rent_frequency: data?.ground_rent_frequency || ''
        }
        setBuildingInfo(info)
        setEditedInfo(info)
      }
    } catch (error) {
      console.error('Error fetching building info:', error)
      toast.error('Failed to load building information')
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
        toast.error('Failed to save building information')
      } else {
        setBuildingInfo(editedInfo)
        setIsEditing(false)
        toast.success('Building information saved successfully')
      }
    } catch (error) {
      console.error('Error saving building info:', error)
      toast.error('Failed to save building information')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedInfo(buildingInfo)
    setIsEditing(false)
    setShowAdditionalFields(false)
  }

  const hasAdditionalInfo = () => {
    return Object.keys(buildingInfo).some(key => 
      key !== 'access_notes' && 
      key !== 'sites_staff' && 
      key !== 'parking_info' && 
      key !== 'council_borough' && 
      buildingInfo[key as keyof BuildingInfoData]
    )
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
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
                size="sm"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Access Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Key className="h-4 w-4 text-teal-600" />
              Access Information
            </div>
            {isEditing ? (
              <Textarea
                value={editedInfo.access_notes || ''}
                onChange={(e) => setEditedInfo({...editedInfo, access_notes: e.target.value})}
                placeholder="Enter access information (entry codes, key collection, etc.)"
                className="text-sm"
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
              <Textarea
                value={editedInfo.sites_staff || ''}
                onChange={(e) => setEditedInfo({...editedInfo, sites_staff: e.target.value})}
                placeholder="Enter sites staff information (concierge, cleaners, etc.)"
                className="text-sm"
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
              <Textarea
                value={editedInfo.parking_info || ''}
                onChange={(e) => setEditedInfo({...editedInfo, parking_info: e.target.value})}
                placeholder="Enter parking information (permits, visitor parking, etc.)"
                className="text-sm"
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
              <Input
                type="text"
                value={editedInfo.council_borough || ''}
                onChange={(e) => setEditedInfo({...editedInfo, council_borough: e.target.value})}
                placeholder="Enter council borough"
                className="text-sm"
              />
            ) : (
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                {buildingInfo.council_borough || 'No council borough information available'}
              </p>
            )}
          </div>
        </div>

        {/* Additional Information Toggle */}
        {!isEditing && hasAdditionalInfo() && (
          <div className="border-t pt-4 mb-4">
            <Button
              onClick={() => setShowAdditionalFields(!showAdditionalFields)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {showAdditionalFields ? 'Hide' : 'Show'} Additional Information
            </Button>
          </div>
        )}

        {/* Add Additional Information Button */}
        {isEditing && !showAdditionalFields && (
          <div className="border-t pt-4 mb-4">
            <Button
              onClick={() => setShowAdditionalFields(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Additional Information
            </Button>
          </div>
        )}

        {/* Additional Information Fields */}
        {(showAdditionalFields || isEditing) && (
          <div className="border-t pt-4 space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Additional Property Information</h3>
            
            {/* Building Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4 text-teal-600" />
                  Building Manager Name
                </div>
                {isEditing ? (
                  <Input
                    value={editedInfo.building_manager_name || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, building_manager_name: e.target.value})}
                    placeholder="Building manager name"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.building_manager_name || 'Not specified'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Mail className="h-4 w-4 text-teal-600" />
                  Building Manager Email
                </div>
                {isEditing ? (
                  <Input
                    type="email"
                    value={editedInfo.building_manager_email || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, building_manager_email: e.target.value})}
                    placeholder="manager@example.com"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.building_manager_email || 'Not specified'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Phone className="h-4 w-4 text-teal-600" />
                  Building Manager Phone
                </div>
                {isEditing ? (
                  <Input
                    value={editedInfo.building_manager_phone || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, building_manager_phone: e.target.value})}
                    placeholder="Phone number"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.building_manager_phone || 'Not specified'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Phone className="h-4 w-4 text-red-600" />
                  Emergency Contact
                </div>
                {isEditing ? (
                  <Input
                    value={editedInfo.emergency_contact_phone || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, emergency_contact_phone: e.target.value})}
                    placeholder="Emergency contact phone"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.emergency_contact_phone || 'Not specified'}
                  </p>
                )}
              </div>
            </div>

            {/* Building Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Building className="h-4 w-4 text-teal-600" />
                  Building Age
                </div>
                {isEditing ? (
                  <Input
                    value={editedInfo.building_age || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, building_age: e.target.value})}
                    placeholder="e.g., 1980s"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.building_age || 'Not specified'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Wrench className="h-4 w-4 text-teal-600" />
                  Construction Type
                </div>
                {isEditing ? (
                  <Select
                    value={editedInfo.construction_type || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, construction_type: e.target.value})}
                    className="text-sm"
                  >
                    <option value="">Select type</option>
                    <option value="concrete">Concrete</option>
                    <option value="steel">Steel Frame</option>
                    <option value="brick">Brick</option>
                    <option value="timber">Timber Frame</option>
                    <option value="mixed">Mixed</option>
                  </Select>
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.construction_type || 'Not specified'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Building className="h-4 w-4 text-teal-600" />
                  Total Floors
                </div>
                {isEditing ? (
                  <Input
                    value={editedInfo.total_floors || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, total_floors: e.target.value})}
                    placeholder="e.g., 8"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.total_floors || 'Not specified'}
                  </p>
                )}
              </div>
            </div>

            {/* Services & Utilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Wrench className="h-4 w-4 text-teal-600" />
                  Heating Type
                </div>
                {isEditing ? (
                  <Select
                    value={editedInfo.heating_type || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, heating_type: e.target.value})}
                    className="text-sm"
                  >
                    <option value="">Select type</option>
                    <option value="central">Central Heating</option>
                    <option value="individual">Individual</option>
                    <option value="district">District Heating</option>
                    <option value="electric">Electric</option>
                  </Select>
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.heating_type || 'Not specified'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Wrench className="h-4 w-4 text-teal-600" />
                  Hot Water Type
                </div>
                {isEditing ? (
                  <Select
                    value={editedInfo.hot_water_type || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, hot_water_type: e.target.value})}
                    className="text-sm"
                  >
                    <option value="">Select type</option>
                    <option value="central">Central</option>
                    <option value="individual">Individual</option>
                    <option value="combi">Combi Boiler</option>
                  </Select>
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.hot_water_type || 'Not specified'}
                  </p>
                )}
              </div>
            </div>

            {/* Waste & Recycling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="h-4 w-4 text-teal-600" />
                  Waste Collection Day
                </div>
                {isEditing ? (
                  <Select
                    value={editedInfo.waste_collection_day || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, waste_collection_day: e.target.value})}
                    className="text-sm"
                  >
                    <option value="">Select day</option>
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </Select>
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.waste_collection_day || 'Not specified'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText className="h-4 w-4 text-teal-600" />
                  Recycling Information
                </div>
                {isEditing ? (
                  <Textarea
                    value={editedInfo.recycling_info || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, recycling_info: e.target.value})}
                    placeholder="Recycling collection details"
                    className="text-sm"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg min-h-[40px]">
                    {buildingInfo.recycling_info || 'Not specified'}
                  </p>
                )}
              </div>
            </div>

            {/* Insurance & Compliance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Shield className="h-4 w-4 text-teal-600" />
                  Building Insurance Provider
                </div>
                {isEditing ? (
                  <Input
                    value={editedInfo.building_insurance_provider || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, building_insurance_provider: e.target.value})}
                    placeholder="Insurance provider name"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.building_insurance_provider || 'Not specified'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="h-4 w-4 text-teal-600" />
                  Insurance Expiry Date
                </div>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedInfo.building_insurance_expiry || ''}
                    onChange={(e) => setEditedInfo({...editedInfo, building_insurance_expiry: e.target.value})}
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {buildingInfo.building_insurance_expiry ? 
                      new Date(buildingInfo.building_insurance_expiry).toLocaleDateString() : 
                      'Not specified'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 