'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Settings, 
  AlertCircle, 
  Info,
  Save,
  X,
  Gavel,
  Briefcase,
  ShieldAlert
} from 'lucide-react'
import { toast } from 'sonner'
import { checkAndAssignBSAAssets } from '@/lib/bsaAssetAssignment'

interface EditBuildingModalProps {
  building: any
  buildingSetup: any
  isOpen: boolean
  onClose: () => void
  onSave: (buildingData: any, setupData: any) => void
}

export default function EditBuildingModal({ 
  building, 
  buildingSetup, 
  isOpen, 
  onClose, 
  onSave 
}: EditBuildingModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [buildingData, setBuildingData] = useState({
    name: building?.name || '',
    address: building?.address || '',
    building_age: building?.building_age || '',
    total_floors: building?.total_floors || '',
    construction_type: building?.construction_type || '',
    lift_available: building?.lift_available || '',
    heating_type: building?.heating_type || '',
    hot_water_type: building?.hot_water_type || '',
    waste_collection_day: building?.waste_collection_day || '',
    recycling_info: building?.recycling_info || '',
    service_charge_frequency: building?.service_charge_frequency || '',
    ground_rent_amount: building?.ground_rent_amount || '',
    ground_rent_frequency: building?.ground_rent_frequency || '',
    fire_safety_status: building?.fire_safety_status || '',
    asbestos_status: building?.asbestos_status || '',
    energy_rating: building?.energy_rating || '',
    building_insurance_provider: building?.building_insurance_provider || '',
    building_insurance_expiry: building?.building_insurance_expiry || '',
    building_manager_name: building?.building_manager_name || '',
    building_manager_email: building?.building_manager_email || '',
    building_manager_phone: building?.building_manager_phone || '',
    emergency_contact_name: building?.emergency_contact_name || '',
    emergency_contact_phone: building?.emergency_contact_phone || '',
    is_hrb: building?.is_hrb || false,
  })

  const [setupData, setSetupData] = useState({
    structure_type: buildingSetup?.structure_type || '',
    client_type: buildingSetup?.client_type || '',
    client_name: buildingSetup?.client_name || '',
    client_email: buildingSetup?.client_email || '',
    client_contact: buildingSetup?.client_contact || '',
    operational_notes: buildingSetup?.operational_notes || '',
  })

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(buildingData, setupData)
      
      // Check if building was marked as HRB and assign BSA assets if needed
      if (buildingData.is_hrb && !building?.is_hrb) {
        try {
          console.log('🏗️ Building marked as HRB, assigning BSA assets...')
          const bsaResult = await checkAndAssignBSAAssets(building.id, true, 'current-user-id') // TODO: Get actual user ID
          
          if (bsaResult.success && 'assigned' in bsaResult && bsaResult.assigned > 0) {
            toast.success(`Building updated successfully! ${bsaResult.assigned} BSA compliance assets automatically assigned.`)
          } else {
            toast.success('Building updated successfully!')
          }
        } catch (bsaError) {
          console.error('❌ BSA asset assignment failed:', bsaError)
          toast.success('Building updated successfully, but BSA asset assignment failed. Please check compliance setup.')
        }
      } else {
        toast.success('Building information updated successfully')
      }
      
      onClose()
    } catch (error) {
      toast.error('Failed to update building information')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Building Information</h2>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Basic Building Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Building Name</Label>
                    <Input
                      id="name"
                      value={buildingData.name}
                      onChange={(e) => setBuildingData({...buildingData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={buildingData.address}
                      onChange={(e) => setBuildingData({...buildingData, address: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="building_age">Building Age</Label>
                    <Input
                      id="building_age"
                      value={buildingData.building_age}
                      onChange={(e) => setBuildingData({...buildingData, building_age: e.target.value})}
                      placeholder="e.g., 25 years"
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_floors">Total Floors</Label>
                    <Input
                      id="total_floors"
                      value={buildingData.total_floors}
                      onChange={(e) => setBuildingData({...buildingData, total_floors: e.target.value})}
                      placeholder="e.g., 8"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Structure */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Legal Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="structure_type">Structure Type</Label>
                    <Select value={setupData.structure_type} onValueChange={(value) => setSetupData({...setupData, structure_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select structure type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Freeholder">Freeholder</SelectItem>
                        <SelectItem value="RMC">RMC (Resident Management Company)</SelectItem>
                        <SelectItem value="RTM">RTM (Right to Manage)</SelectItem>
                        <SelectItem value="Tripartite">Tripartite Lease</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="client_type">Client Type</Label>
                    <Select value={setupData.client_type} onValueChange={(value) => setSetupData({...setupData, client_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Freeholder">Freeholder</SelectItem>
                        <SelectItem value="RMC Director">RMC Director</SelectItem>
                        <SelectItem value="Property Manager">Property Manager</SelectItem>
                        <SelectItem value="Managing Agent">Managing Agent</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="client_name">Client Name</Label>
                    <Input
                      id="client_name"
                      value={setupData.client_name}
                      onChange={(e) => setSetupData({...setupData, client_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_email">Client Email</Label>
                    <Input
                      id="client_email"
                      type="email"
                      value={setupData.client_email}
                      onChange={(e) => setSetupData({...setupData, client_email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_contact">Client Phone</Label>
                    <Input
                      id="client_contact"
                      value={setupData.client_contact}
                      onChange={(e) => setSetupData({...setupData, client_contact: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="operational_notes">Operational Notes</Label>
                  <Textarea
                    id="operational_notes"
                    value={setupData.operational_notes}
                    onChange={(e) => setSetupData({...setupData, operational_notes: e.target.value})}
                    placeholder="Important operational information..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Building Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Building Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="building_manager_name">Manager Name</Label>
                    <Input
                      id="building_manager_name"
                      value={buildingData.building_manager_name}
                      onChange={(e) => setBuildingData({...buildingData, building_manager_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="building_manager_email">Manager Email</Label>
                    <Input
                      id="building_manager_email"
                      type="email"
                      value={buildingData.building_manager_email}
                      onChange={(e) => setBuildingData({...buildingData, building_manager_email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="building_manager_phone">Manager Phone</Label>
                    <Input
                      id="building_manager_phone"
                      value={buildingData.building_manager_phone}
                      onChange={(e) => setBuildingData({...buildingData, building_manager_phone: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={buildingData.emergency_contact_name}
                      onChange={(e) => setBuildingData({...buildingData, emergency_contact_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={buildingData.emergency_contact_phone}
                      onChange={(e) => setBuildingData({...buildingData, emergency_contact_phone: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* High-Risk Building Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  High-Risk Building (HRB) Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_hrb"
                    checked={buildingData.is_hrb}
                    onChange={(e) => setBuildingData({...buildingData, is_hrb: e.target.checked})}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="is_hrb" className="text-sm font-medium text-gray-900">
                    This is a High-Risk Building (HRB)
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  High-Risk Buildings are subject to additional safety regulations and compliance requirements under the Building Safety Act 2022.
                </p>
              </CardContent>
            </Card>

            {/* Construction & Facilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Construction & Facilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="construction_type">Construction Type</Label>
                    <Input
                      id="construction_type"
                      value={buildingData.construction_type}
                      onChange={(e) => setBuildingData({...buildingData, construction_type: e.target.value})}
                      placeholder="e.g., Concrete, Brick, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="lift_available">Lift Available</Label>
                    <Select value={buildingData.lift_available} onValueChange={(value) => setBuildingData({...buildingData, lift_available: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select lift status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="heating_type">Heating Type</Label>
                    <Input
                      id="heating_type"
                      value={buildingData.heating_type}
                      onChange={(e) => setBuildingData({...buildingData, heating_type: e.target.value})}
                      placeholder="e.g., Central heating, Individual boilers"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hot_water_type">Hot Water Type</Label>
                    <Input
                      id="hot_water_type"
                      value={buildingData.hot_water_type}
                      onChange={(e) => setBuildingData({...buildingData, hot_water_type: e.target.value})}
                      placeholder="e.g., Central, Individual"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services & Utilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Services & Utilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="waste_collection_day">Waste Collection Day</Label>
                    <Input
                      id="waste_collection_day"
                      value={buildingData.waste_collection_day}
                      onChange={(e) => setBuildingData({...buildingData, waste_collection_day: e.target.value})}
                      placeholder="e.g., Monday"
                    />
                  </div>
                  <div>
                    <Label htmlFor="recycling_info">Recycling Information</Label>
                    <Input
                      id="recycling_info"
                      value={buildingData.recycling_info}
                      onChange={(e) => setBuildingData({...buildingData, recycling_info: e.target.value})}
                      placeholder="e.g., Weekly collection"
                    />
                  </div>
                  <div>
                    <Label htmlFor="service_charge_frequency">Service Charge Frequency</Label>
                    <Select value={buildingData.service_charge_frequency} onValueChange={(value) => setBuildingData({...buildingData, service_charge_frequency: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Annually">Annually</SelectItem>
                        <SelectItem value="Bi-annually">Bi-annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ground_rent_amount">Ground Rent Amount</Label>
                    <Input
                      id="ground_rent_amount"
                      type="number"
                      value={buildingData.ground_rent_amount}
                      onChange={(e) => setBuildingData({...buildingData, ground_rent_amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ground_rent_frequency">Ground Rent Frequency</Label>
                    <Select value={buildingData.ground_rent_frequency} onValueChange={(value) => setBuildingData({...buildingData, ground_rent_frequency: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Annually">Annually</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Safety & Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Safety & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fire_safety_status">Fire Safety Status</Label>
                    <Select value={buildingData.fire_safety_status} onValueChange={(value) => setBuildingData({...buildingData, fire_safety_status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Compliant">Compliant</SelectItem>
                        <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="asbestos_status">Asbestos Status</Label>
                    <Select value={buildingData.asbestos_status} onValueChange={(value) => setBuildingData({...buildingData, asbestos_status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Clear">Clear</SelectItem>
                        <SelectItem value="Present">Present</SelectItem>
                        <SelectItem value="Under Management">Under Management</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="energy_rating">Energy Rating</Label>
                    <Select value={buildingData.energy_rating} onValueChange={(value) => setBuildingData({...buildingData, energy_rating: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                        <SelectItem value="F">F</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="building_insurance_provider">Insurance Provider</Label>
                    <Input
                      id="building_insurance_provider"
                      value={buildingData.building_insurance_provider}
                      onChange={(e) => setBuildingData({...buildingData, building_insurance_provider: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="building_insurance_expiry">Insurance Expiry Date</Label>
                    <Input
                      id="building_insurance_expiry"
                      type="date"
                      value={buildingData.building_insurance_expiry}
                      onChange={(e) => setBuildingData({...buildingData, building_insurance_expiry: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 