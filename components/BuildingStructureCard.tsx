'use client'

import { useState, useEffect } from 'react'
import { Building, Users, User, Edit3, Save, X, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BuildingStructureData {
  building: {
    id: string
    name: string
    structure_type: string | null
    status: string
  }
  client: {
    id: string
    name: string
    email: string
    phone: string
    address: string
    client_type: string
    contact_person: string
    website: string
    notes: string
  } | null
  rmc_directors: Array<{
    id: string
    position: string
    appointed_date: string
    notes: string
    leaseholder: {
      id: string
      full_name: string
      email: string
      phone_number: string
    }
  }>
}

interface Leaseholder {
  id: string
  full_name: string
  email: string
  phone_number: string
  correspondence_address: string
  is_director: boolean
  director_since: string | null
  director_notes: string | null
  unit_number: string
}

interface BuildingStructureCardProps {
  buildingId: string
}

export default function BuildingStructureCard({ buildingId }: BuildingStructureCardProps) {
  const [data, setData] = useState<BuildingStructureData | null>(null)
  const [leaseholders, setLeaseholders] = useState<Leaseholder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<BuildingStructureData | null>(null)

  // Fetch building structure data
  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch building structure data
      const structureResponse = await fetch(`/api/buildings/${buildingId}/structure`)
      if (!structureResponse.ok) {
        throw new Error('Failed to fetch building structure')
      }
      const structureResult = await structureResponse.json()
      setData(structureResult)
      setEditData(structureResult)

      // Fetch leaseholders for RMC directors dropdown
      const leaseholdersResponse = await fetch(`/api/buildings/${buildingId}/leaseholders`)
      if (leaseholdersResponse.ok) {
        const leaseholdersResult = await leaseholdersResponse.json()
        setLeaseholders(leaseholdersResult.leaseholders || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [buildingId])

  // Save changes
  const handleSave = async () => {
    if (!editData) return

    try {
      setLoading(true)
      const response = await fetch(`/api/buildings/${buildingId}/structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      })

      if (!response.ok) {
        throw new Error('Failed to update building structure')
      }

      setData(editData)
      setIsEditing(false)
      await fetchData() // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setLoading(false)
    }
  }

  // Cancel editing
  const handleCancel = () => {
    setEditData(data)
    setIsEditing(false)
    setError(null)
  }

  // Update edit data
  const updateEditData = (field: string, value: any) => {
    if (!editData) return

    if (field.startsWith('building.')) {
      const buildingField = field.split('.')[1]
      setEditData({
        ...editData,
        building: {
          ...editData.building,
          [buildingField]: value
        }
      })
    } else if (field.startsWith('client.')) {
      const clientField = field.split('.')[1]
      setEditData({
        ...editData,
        client: {
          ...editData.client,
          [clientField]: value
        }
      })
    }
  }

  // Initialize client data if it doesn't exist
  const initializeClientData = () => {
    if (!editData?.client) {
      setEditData({
        ...editData!,
        client: {
          id: '',
          name: '',
          email: '',
          phone: '',
          address: '',
          client_type: 'Freeholder',
          contact_person: '',
          website: '',
          notes: ''
        }
      })
    }
  }

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Building Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Building Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button onClick={fetchData} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Building Structure
          </CardTitle>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(true)
                  initializeClientData()
                }}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Building Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Building Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="structure-type">Structure Type</Label>
              {isEditing ? (
                <Select
                  value={editData?.building.structure_type || ''}
                  onValueChange={(value) => updateEditData('building.structure_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select structure type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Freehold">Freehold</SelectItem>
                    <SelectItem value="RMC">RMC</SelectItem>
                    <SelectItem value="Tripartite">Tripartite</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-gray-50 rounded border">
                  {data.building.structure_type || 'Not set'}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              {isEditing ? (
                <Select
                  value={editData?.building.status || 'Standard'}
                  onValueChange={(value) => updateEditData('building.status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-gray-50 rounded border">
                  <Badge variant={data.building.status === 'Standard' ? 'default' : 'secondary'}>
                    {data.building.status}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Client Information
          </h3>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client-name">Client Name</Label>
                  <Input
                    id="client-name"
                    value={editData?.client?.name || ''}
                    onChange={(e) => updateEditData('client.name', e.target.value)}
                    placeholder="Enter client name"
                  />
                </div>
                <div>
                  <Label htmlFor="client-type">Client Type</Label>
                  <Select
                    value={editData?.client?.client_type || 'Freeholder'}
                    onValueChange={(value) => updateEditData('client.client_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Freeholder">Freeholder</SelectItem>
                      <SelectItem value="Managing Agent">Managing Agent</SelectItem>
                      <SelectItem value="RMC">RMC</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client-email">Client Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={editData?.client?.email || ''}
                    onChange={(e) => updateEditData('client.email', e.target.value)}
                    placeholder="Enter client email"
                  />
                </div>
                <div>
                  <Label htmlFor="client-phone">Client Phone</Label>
                  <Input
                    id="client-phone"
                    value={editData?.client?.phone || ''}
                    onChange={(e) => updateEditData('client.phone', e.target.value)}
                    placeholder="Enter client phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client-contact">Contact Person</Label>
                  <Input
                    id="client-contact"
                    value={editData?.client?.contact_person || ''}
                    onChange={(e) => updateEditData('client.contact_person', e.target.value)}
                    placeholder="Enter contact person"
                  />
                </div>
                <div>
                  <Label htmlFor="client-website">Website</Label>
                  <Input
                    id="client-website"
                    type="url"
                    value={editData?.client?.website || ''}
                    onChange={(e) => updateEditData('client.website', e.target.value)}
                    placeholder="Enter website URL"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="client-address">Client Address</Label>
                <Textarea
                  id="client-address"
                  value={editData?.client?.address || ''}
                  onChange={(e) => updateEditData('client.address', e.target.value)}
                  placeholder="Enter client address"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="client-notes">Notes</Label>
                <Textarea
                  id="client-notes"
                  value={editData?.client?.notes || ''}
                  onChange={(e) => updateEditData('client.notes', e.target.value)}
                  placeholder="Enter additional notes"
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              {data.client ? (
                <div className="space-y-2">
                  <div><strong>Name:</strong> {data.client.name}</div>
                  <div><strong>Type:</strong> <Badge variant="outline">{data.client.client_type}</Badge></div>
                  <div><strong>Email:</strong> {data.client.email}</div>
                  <div><strong>Phone:</strong> {data.client.phone}</div>
                  {data.client.contact_person && (
                    <div><strong>Contact:</strong> {data.client.contact_person}</div>
                  )}
                  {data.client.website && (
                    <div><strong>Website:</strong> <a href={data.client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{data.client.website}</a></div>
                  )}
                  <div><strong>Address:</strong> {data.client.address}</div>
                  {data.client.notes && (
                    <div><strong>Notes:</strong> {data.client.notes}</div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No client information available</p>
              )}
            </div>
          )}
        </div>

        {/* RMC Directors */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            RMC Directors
          </h3>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label>Select Directors from Leaseholders</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {leaseholders.map((leaseholder) => (
                    <div key={leaseholder.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`director-${leaseholder.id}`}
                        checked={leaseholder.is_director}
                        onChange={(e) => {
                          // This would need to be implemented with a separate API call
                          // to update the leaseholder's director status
                          console.log('Toggle director status for:', leaseholder.full_name)
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`director-${leaseholder.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{leaseholder.full_name}</div>
                        <div className="text-sm text-gray-600">
                          {leaseholder.email} • Unit {leaseholder.unit_number}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Check the boxes above to assign leaseholders as RMC directors
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.rmc_directors.length > 0 ? (
                data.rmc_directors.map((director) => (
                  <div key={director.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{director.leaseholder.full_name}</div>
                        <div className="text-sm text-gray-600">
                          <strong>Position:</strong> {director.position}
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Email:</strong> {director.leaseholder.email}
                        </div>
                        {director.appointed_date && (
                          <div className="text-sm text-gray-600">
                            <strong>Appointed:</strong> {new Date(director.appointed_date).toLocaleDateString()}
                          </div>
                        )}
                        {director.notes && (
                          <div className="text-sm text-gray-600">
                            <strong>Notes:</strong> {director.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                  No RMC directors assigned
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 