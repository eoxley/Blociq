'use client'

import { useEffect, useState } from 'react'
import { Building, Users, User, Edit3, Save, X } from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface BuildingData {
  id: string
  name: string
  structure_type: string | null
  status: string
}

interface ClientData {
  id?: string
  name: string
  email: string
  phone: string
  address: string
  client_type: string
  contact_person: string
  website: string
  notes: string
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

interface EditBuildingClientModalProps {
  buildingId: string
  buildingName: string
  onSave?: () => void
}

export default function EditBuildingClientModal({ 
  buildingId, 
  buildingName, 
  onSave 
}: EditBuildingClientModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [building, setBuilding] = useState<BuildingData>({
    id: buildingId,
    name: buildingName,
    structure_type: null,
    status: 'Standard'
  })
  const [client, setClient] = useState<ClientData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    client_type: 'Freeholder',
    contact_person: '',
    website: '',
    notes: ''
  })
  const [leaseholders, setLeaseholders] = useState<Leaseholder[]>([])
  const [selectedDirectors, setSelectedDirectors] = useState<string[]>([])

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch building structure data
      const structureResponse = await fetch(`/api/buildings/${buildingId}/structure`)
      if (!structureResponse.ok) {
        throw new Error('Failed to fetch building structure')
      }
      const structureData = await structureResponse.json()

      // Fetch leaseholders
      const leaseholdersResponse = await fetch(`/api/buildings/${buildingId}/leaseholders`)
      if (!leaseholdersResponse.ok) {
        throw new Error('Failed to fetch leaseholders')
      }
      const leaseholdersData = await leaseholdersResponse.json()

      // Update state
      setBuilding({
        id: buildingId,
        name: buildingName,
        structure_type: structureData.building.structure_type,
        status: structureData.building.status
      })

      if (structureData.client) {
        setClient({
          id: structureData.client.id,
          name: structureData.client.name || '',
          email: structureData.client.email || '',
          phone: structureData.client.phone || '',
          address: structureData.client.address || '',
          client_type: structureData.client.client_type || 'Freeholder',
          contact_person: structureData.client.contact_person || '',
          website: structureData.client.website || '',
          notes: structureData.client.notes || ''
        })
      }

      setLeaseholders(leaseholdersData.leaseholders || [])
      
      // Set selected directors
      const directorIds = leaseholdersData.leaseholders
        ?.filter((lh: Leaseholder) => lh.is_director)
        .map((lh: Leaseholder) => lh.id) || []
      setSelectedDirectors(directorIds)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle save
  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/buildings/${buildingId}/structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          structure_type: building.structure_type,
          status: building.status,
          client: client,
          rmc_directors: selectedDirectors.map(id => ({
            leaseholder_id: id,
            position: 'Director',
            appointed_date: new Date().toISOString().split('T')[0],
            notes: ''
          }))
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save changes')
      }

      // Update leaseholder director status
      await fetch('/api/leaseholders/update-directors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId,
          directorIds: selectedDirectors
        }),
      })

      setOpen(false)
      if (onSave) {
        onSave()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setLoading(false)
    }
  }

  // Handle director selection
  const toggleDirector = (leaseholderId: string) => {
    setSelectedDirectors(prev => 
      prev.includes(leaseholderId)
        ? prev.filter(id => id !== leaseholderId)
        : [...prev, leaseholderId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setOpen(true)
            fetchData()
          }}
          className="flex items-center gap-2"
        >
          <Edit3 className="h-4 w-4" />
          Edit Structure & Client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Edit Building Structure & Client
          </DialogTitle>
          <p className="text-sm text-gray-600">{buildingName}</p>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Building Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Building Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="structure-type">Structure Type</Label>
                <Select
                  value={building.structure_type || ''}
                  onValueChange={(value) => setBuilding({ ...building, structure_type: value })}
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
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={building.status}
                  onValueChange={(value) => setBuilding({ ...building, status: value })}
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
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client-name">Client Name</Label>
                  <Input
                    id="client-name"
                    value={client.name}
                    onChange={(e) => setClient({ ...client, name: e.target.value })}
                    placeholder="Enter client name"
                  />
                </div>
                <div>
                  <Label htmlFor="client-type">Client Type</Label>
                  <Select
                    value={client.client_type}
                    onValueChange={(value) => setClient({ ...client, client_type: value })}
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
                    value={client.email}
                    onChange={(e) => setClient({ ...client, email: e.target.value })}
                    placeholder="Enter client email"
                  />
                </div>
                <div>
                  <Label htmlFor="client-phone">Client Phone</Label>
                  <Input
                    id="client-phone"
                    value={client.phone}
                    onChange={(e) => setClient({ ...client, phone: e.target.value })}
                    placeholder="Enter client phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client-contact">Contact Person</Label>
                  <Input
                    id="client-contact"
                    value={client.contact_person}
                    onChange={(e) => setClient({ ...client, contact_person: e.target.value })}
                    placeholder="Enter contact person"
                  />
                </div>
                <div>
                  <Label htmlFor="client-website">Website</Label>
                  <Input
                    id="client-website"
                    type="url"
                    value={client.website}
                    onChange={(e) => setClient({ ...client, website: e.target.value })}
                    placeholder="Enter website URL"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="client-address">Client Address</Label>
                <Textarea
                  id="client-address"
                  value={client.address}
                  onChange={(e) => setClient({ ...client, address: e.target.value })}
                  placeholder="Enter client address"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="client-notes">Notes</Label>
                <Textarea
                  id="client-notes"
                  value={client.notes}
                  onChange={(e) => setClient({ ...client, notes: e.target.value })}
                  placeholder="Enter additional notes"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* RMC Directors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              RMC Directors
            </h3>
            <div>
              <Label>Select Directors from Leaseholders</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {leaseholders.length > 0 ? (
                  leaseholders.map((leaseholder) => (
                    <div key={leaseholder.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`director-${leaseholder.id}`}
                        checked={selectedDirectors.includes(leaseholder.id)}
                        onChange={() => toggleDirector(leaseholder.id)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`director-${leaseholder.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{leaseholder.full_name}</div>
                        <div className="text-sm text-gray-600">
                          {leaseholder.email} • Unit {leaseholder.unit_number}
                        </div>
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No leaseholders found for this building</p>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Check the boxes above to assign leaseholders as RMC directors
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 