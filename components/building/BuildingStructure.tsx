'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Mail, AlertTriangle, Loader2 } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'

interface BuildingStructureProps {
  buildingId: string
}

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
    } | null
  }>
}

export default function BuildingStructure({ buildingId }: BuildingStructureProps) {
  const [data, setData] = useState<BuildingStructureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBuildingStructure()
  }, [buildingId])

  const fetchBuildingStructure = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/buildings/${buildingId}/structure`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch building structure: ${response.status}`)
      }

      const structureData = await response.json()
      setData(structureData)
    } catch (err) {
      console.error('Error fetching building structure:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch building structure')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              <span className="text-gray-600">Loading building structure...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl shadow-md border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">Failed to load building structure</p>
                <p className="text-sm text-red-500">{error}</p>
                <button 
                  onClick={fetchBuildingStructure}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl shadow-md">
          <CardContent className="p-4">
            <p className="text-gray-600">No building structure data available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Ownership Structure Section */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">🏛️ Building Structure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <p><strong>Ownership Model:</strong> {data.building.structure_type || 'Not set'}</p>
            <p><strong>Status:</strong> {data.building.status}</p>
            {data.client && (
              <>
                <p><strong>Client:</strong> {data.client.name}</p>
                <p><strong>Client Type:</strong> {data.client.client_type}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client Information Section */}
      {data.client && (
        <Card className="rounded-2xl shadow-md">
          <CardContent className="p-4 space-y-4">
            <h2 className="text-xl font-semibold">🏢 Client Information</h2>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p><strong>Name:</strong> {data.client.name}</p>
                  <p><strong>Type:</strong> {data.client.client_type}</p>
                  <p><strong>Contact Person:</strong> {data.client.contact_person || 'Not specified'}</p>
                  <p><strong>Email:</strong> {data.client.email || 'Not specified'}</p>
                  <p><strong>Phone:</strong> {data.client.phone || 'Not specified'}</p>
                  <p><strong>Website:</strong> {data.client.website || 'Not specified'}</p>
                </div>
                {data.client.notes && (
                  <div className="mt-3">
                    <p><strong>Notes:</strong></p>
                    <p className="text-gray-600 text-sm">{data.client.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Directors Section */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">👥 RMC Directors</h2>
          {data.rmc_directors.length > 0 ? (
            <div className="space-y-3">
              {data.rmc_directors.map((director) => (
                <div
                  key={director.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {director.leaseholder?.full_name || 'Unknown Director'}
                    </p>
                    <p className="text-sm text-gray-600">{director.position}</p>
                    {director.notes && (
                      <p className="text-sm text-gray-500">{director.notes}</p>
                    )}
                    {director.appointed_date && (
                      <p className="text-sm text-gray-500">
                        Appointed: {new Date(director.appointed_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {director.leaseholder?.email ? (
                    <a
                      href={`mailto:${director.leaseholder.email}`}
                      className="flex items-center gap-1 text-blue-600 hover:underline mt-2 md:mt-0"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-2 md:mt-0">No contact listed</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No RMC directors recorded for this building</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}