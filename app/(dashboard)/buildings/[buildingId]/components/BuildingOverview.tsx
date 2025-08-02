'use client'

import React, { useState } from 'react'
import { Building2, Edit, Shield, User, Phone, Mail, MapPin, FileText, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface BuildingOverviewProps {
  building: any
  buildingSetup: any
}

export default function BuildingOverview({ building, buildingSetup }: BuildingOverviewProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: building?.name || '',
    address: building?.address || '',
    structure_type: buildingSetup?.structure_type || '',
    is_hrb: building?.is_hrb || false,
    client_type: buildingSetup?.client_type || '',
    client_name: buildingSetup?.client_name || '',
    client_contact: buildingSetup?.client_contact || '',
    client_email: buildingSetup?.client_email || '',
    assigned_manager: buildingSetup?.assigned_manager || '',
    operational_notes: buildingSetup?.operational_notes || ''
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Update building table
      const buildingResponse = await fetch(`/api/buildings/${building.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          is_hrb: formData.is_hrb
        })
      })

      // Update or create building_setup
      const setupResponse = await fetch('/api/building-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: building.id,
          structure_type: formData.structure_type,
          client_type: formData.client_type,
          client_name: formData.client_name,
          client_contact: formData.client_contact,
          client_email: formData.client_email,
          assigned_manager: formData.assigned_manager,
          operational_notes: formData.operational_notes
        })
      })

      if (buildingResponse.ok && setupResponse.ok) {
        toast.success('Building information updated successfully')
        setIsEditModalOpen(false)
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        throw new Error('Failed to update building information')
      }
    } catch (error) {
      console.error('Error updating building:', error)
      toast.error('Failed to update building information')
    } finally {
      setIsLoading(false)
    }
  }

  const getStructureTypeColor = (type: string) => {
    switch (type) {
      case 'Freehold':
        return 'bg-blue-100 text-blue-800'
      case 'RMC':
        return 'bg-green-100 text-green-800'
      case 'Tripartite':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getClientTypeColor = (type: string) => {
    switch (type) {
      case 'Freeholder Company':
        return 'bg-orange-100 text-orange-800'
      case 'Board of Directors':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Building Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{building?.name}</h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {building?.address}
                </p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {buildingSetup?.structure_type && (
                <Badge className={getStructureTypeColor(buildingSetup.structure_type)}>
                  {buildingSetup.structure_type}
                </Badge>
              )}
              {building?.is_hrb && (
                <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  HRB Building
                </Badge>
              )}
              {buildingSetup?.client_type && (
                <Badge className={getClientTypeColor(buildingSetup.client_type)}>
                  {buildingSetup.client_type}
                </Badge>
              )}
            </div>

            {/* Client Information */}
            {buildingSetup?.client_name && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    <strong>Client:</strong> {buildingSetup.client_name}
                  </span>
                </div>
                {buildingSetup?.client_contact && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      <strong>Contact:</strong> {buildingSetup.client_contact}
                    </span>
                  </div>
                )}
                {buildingSetup?.client_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      <strong>Email:</strong> {buildingSetup.client_email}
                    </span>
                  </div>
                )}
                {buildingSetup?.assigned_manager && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      <strong>Manager:</strong> {buildingSetup.assigned_manager}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Operational Notes */}
            {buildingSetup?.operational_notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Operational Notes</span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {buildingSetup.operational_notes}
                </p>
              </div>
            )}
          </div>

          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Building Info
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Building Information</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Building Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="structure_type">Structure Type</Label>
                      <Select value={formData.structure_type} onValueChange={(value) => handleInputChange('structure_type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select structure type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Freehold">Freehold</SelectItem>
                          <SelectItem value="RMC">RMC</SelectItem>
                          <SelectItem value="Tripartite">Tripartite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_hrb"
                        checked={formData.is_hrb}
                        onCheckedChange={(checked) => handleInputChange('is_hrb', checked)}
                      />
                      <Label htmlFor="is_hrb">High-Risk Building (HRB)</Label>
                    </div>
                  </div>
                </div>

                {/* Client Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Client Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="client_type">Client Type</Label>
                      <Select value={formData.client_type} onValueChange={(value) => handleInputChange('client_type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Freeholder Company">Freeholder Company</SelectItem>
                          <SelectItem value="Board of Directors">Board of Directors</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="client_name">Client Name</Label>
                      <Input
                        id="client_name"
                        value={formData.client_name}
                        onChange={(e) => handleInputChange('client_name', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="client_contact">Client Contact</Label>
                      <Input
                        id="client_contact"
                        value={formData.client_contact}
                        onChange={(e) => handleInputChange('client_contact', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="client_email">Client Email</Label>
                      <Input
                        id="client_email"
                        type="email"
                        value={formData.client_email}
                        onChange={(e) => handleInputChange('client_email', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="assigned_manager">Assigned Manager</Label>
                    <Input
                      id="assigned_manager"
                      value={formData.assigned_manager}
                      onChange={(e) => handleInputChange('assigned_manager', e.target.value)}
                    />
                  </div>
                </div>

                {/* Operational Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Operational Notes</h3>
                  <div>
                    <Label htmlFor="operational_notes">Notes</Label>
                    <Textarea
                      id="operational_notes"
                      value={formData.operational_notes}
                      onChange={(e) => handleInputChange('operational_notes', e.target.value)}
                      placeholder="Enter operational notes, access codes, bin store info, etc."
                      rows={4}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
} 