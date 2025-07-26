'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Building2, 
  MapPin, 
  AlertTriangle, 
  Users, 
  Home,
  User,
  Mail,
  Phone,
  Info
} from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

// Type definitions based on the actual schema
interface Building {
  id: string
  name: string
  address: string | null
  access_notes: string | null
  parking_info: string | null
}

interface Leaseholder {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  unit_id: string
}

interface Unit {
  id: string
  unit_number: string
  floor: string | null
  type: string | null
  building_id: string
  leaseholder_id: string | null
  leaseholders?: Leaseholder[]
}

export default function BuildingDetailPage() {
  const params = useParams()
  const buildingId = params?.buildingId as string

  const [building, setBuilding] = useState<Building | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!buildingId) {
        setError('No building ID provided')
        setLoading(false)
        return
      }

      console.log('📌 Building ID received:', buildingId)

      try {
        // Fetch building details
        const { data: buildingData, error: buildingError } = await supabase
          .from('buildings')
          .select('id, name, address, access_notes, parking_info')
          .eq('id', buildingId)
          .single()

        console.log('🏢 Building data:', buildingData)
        if (buildingError) {
          console.error('❌ Building fetch error:', buildingError)
          setError('Building not found')
          setLoading(false)
          return
        }

        // Fetch units with leaseholder information
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select(`
            id,
            unit_number,
            floor,
            type,
            building_id,
            leaseholder_id,
            leaseholders (
              id,
              name,
              email,
              phone,
              unit_id
            )
          `)
          .eq('building_id', buildingId)
          .order('unit_number')

        console.log('🏠 Units fetched:', unitData)
        if (unitError) {
          console.error('❌ Units fetch error:', unitError)
          // Don't set error here, just log it and continue with empty units
        }

        setBuilding(buildingData)
        setUnits(unitData || [])
        setLoading(false)
      } catch (err) {
        console.error('❌ Unexpected error:', err)
        setError('An unexpected error occurred')
        setLoading(false)
      }
    }

    fetchData()
  }, [buildingId])

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Building2 className="h-8 w-8 text-teal-600" />
              </div>
              <p className="text-lg text-gray-600">Loading building information...</p>
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  if (error || !building) {
    return (
      <LayoutWithSidebar>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-900 mb-2">Building Not Found</h1>
            <p className="text-red-700">{error || 'The requested building could not be found.'}</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  return (
    <LayoutWithSidebar>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Building Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{building.name}</h1>
                {building.address && (
                  <div className="flex items-center gap-2 text-white/90">
                    <MapPin className="h-5 w-5" />
                    <span className="text-lg">{building.address}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Building Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {building.access_notes && (
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-white/80" />
                    <h3 className="font-semibold text-white">Access Notes</h3>
                  </div>
                  <p className="text-white/90 text-sm">{building.access_notes}</p>
                </div>
              )}
              
              {building.parking_info && (
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-white/80" />
                    <h3 className="font-semibold text-white">Parking Information</h3>
                  </div>
                  <p className="text-white/90 text-sm">{building.parking_info}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Units Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Home className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Units</h2>
                  <p className="text-gray-600">
                    {units.length} unit{units.length !== 1 ? 's' : ''} in this building
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {units.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Units Yet</h3>
                <p className="text-gray-600">No units have been added to this building yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {units.map((unit) => {
                  const leaseholder = unit.leaseholders && unit.leaseholders.length > 0 
                    ? unit.leaseholders[0] 
                    : null

                  return (
                    <div 
                      key={unit.id} 
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Unit Header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                              <Home className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900">
                                Unit {unit.unit_number}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {unit.floor && (
                                  <span>Floor {unit.floor}</span>
                                )}
                                {unit.type && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {unit.type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Leaseholder Information */}
                          {leaseholder ? (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <User className="h-4 w-4 text-green-600" />
                                <h4 className="font-medium text-gray-900">
                                  {leaseholder.name || 'Unnamed Leaseholder'}
                                </h4>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {leaseholder.email && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <a 
                                      href={`mailto:${leaseholder.email}`}
                                      className="text-blue-600 hover:underline"
                                    >
                                      {leaseholder.email}
                                    </a>
                                  </div>
                                )}
                                
                                {leaseholder.phone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <a 
                                      href={`tel:${leaseholder.phone}`}
                                      className="text-blue-600 hover:underline"
                                    >
                                      {leaseholder.phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm text-yellow-800 font-medium">
                                  No leaseholder assigned
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {units.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Home className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Units</p>
                  <p className="text-2xl font-bold text-gray-900">{units.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Occupied Units</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {units.filter(unit => unit.leaseholders && unit.leaseholders.length > 0).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Vacant Units</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {units.filter(unit => !unit.leaseholders || unit.leaseholders.length === 0).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  )
} 