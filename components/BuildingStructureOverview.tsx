'use client'

import { useState, useEffect } from 'react'
import { Building, Users, User, Edit3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import EditBuildingClientModal from './EditBuildingClientModal'

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

interface BuildingStructureOverviewProps {
  buildingId: string
  buildingName: string
}

export default function BuildingStructureOverview({ 
  buildingId, 
  buildingName 
}: BuildingStructureOverviewProps) {
  const [data, setData] = useState<BuildingStructureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/buildings/${buildingId}/structure`)
      if (!response.ok) {
        throw new Error('Failed to fetch building structure')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [buildingId])

  const handleSave = () => {
    fetchData() // Refresh data after save
  }

  if (loading) {
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

  if (error) {
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
            <button onClick={fetchData} className="mt-2 text-blue-600 hover:underline">
              Try Again
            </button>
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
          <EditBuildingClientModal 
            buildingId={buildingId} 
            buildingName={buildingName}
            onSave={handleSave}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Building Details */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Building Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-600">Structure Type:</span>
              <div className="mt-1">
                {data.building.structure_type ? (
                  <Badge variant="outline">{data.building.structure_type}</Badge>
                ) : (
                  <span className="text-gray-500">Not set</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Status:</span>
              <div className="mt-1">
                <Badge variant={data.building.status === 'Standard' ? 'default' : 'secondary'}>
                  {data.building.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Client Information
          </h3>
          {data.client ? (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{data.client.name}</span>
                <Badge variant="outline">{data.client.client_type}</Badge>
              </div>
              {data.client.email && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {data.client.email}
                </div>
              )}
              {data.client.phone && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Phone:</span> {data.client.phone}
                </div>
              )}
              {data.client.contact_person && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Contact:</span> {data.client.contact_person}
                </div>
              )}
              {data.client.website && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Website:</span> 
                  <a href={data.client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    {data.client.website}
                  </a>
                </div>
              )}
              {data.client.address && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Address:</span> {data.client.address}
                </div>
              )}
              {data.client.notes && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Notes:</span> {data.client.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              No client information available
            </div>
          )}
        </div>

        {/* RMC Directors */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            RMC Directors
          </h3>
          {data.rmc_directors.length > 0 ? (
            <div className="space-y-2">
              {data.rmc_directors.map((director) => (
                <div key={director.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{director.leaseholder.full_name}</div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Position:</span> {director.position}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Email:</span> {director.leaseholder.email}
                      </div>
                      {director.appointed_date && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Appointed:</span> {new Date(director.appointed_date).toLocaleDateString()}
                        </div>
                      )}
                      {director.notes && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {director.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              No RMC directors assigned
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 