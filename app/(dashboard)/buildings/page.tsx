'use client'

import React, { useState, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { 
  Building2, 
  MapPin, 
  Users, 
  Plus,
  Eye,
  ArrowRight,
  Search
} from 'lucide-react'

// Client component for the buildings list with search functionality
function BuildingsList({ initialBuildings }: { initialBuildings: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter buildings based on search term (case-insensitive)
  const filteredBuildings = useMemo(() => {
    if (!searchTerm.trim()) return initialBuildings
    
    return initialBuildings.filter(building => {
      const searchLower = searchTerm.toLowerCase()
      const nameMatch = building.name?.toLowerCase().includes(searchLower)
      const addressMatch = building.address?.toLowerCase().includes(searchLower)
      return nameMatch || addressMatch
    })
  }, [initialBuildings, searchTerm])

  return (
    <div>
      {/* Search and Create Section */}
      <div className="mb-12">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search buildings by name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white shadow-sm"
              />
            </div>
          </div>

          {/* Create New Building Button */}
          <Link 
            href="/dashboard/buildings/create"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-800 transform hover:-translate-y-0.5 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <Plus className="h-5 w-5" />
            Create New Building
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Search Results Count */}
        {searchTerm && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredBuildings.length} of {initialBuildings.length} buildings
          </div>
        )}
      </div>

      {/* Buildings Grid */}
      {filteredBuildings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBuildings.map((building) => (
            <div 
              key={building.id}
              className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              {/* Building Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>

              {/* Building Name */}
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                🏢 {building.name}
              </h3>

              {/* Address */}
              {building.address && (
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-600 leading-relaxed">
                    📍 {building.address}
                  </p>
                </div>
              )}

              {/* Live Unit Count */}
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-5 w-5 text-teal-600" />
                <p className="text-gray-600">
                  🧱 {building.liveUnitCount || 0} {(building.liveUnitCount || 0) === 1 ? 'unit' : 'units'}
                </p>
              </div>

              {/* View Button */}
              <Link 
                href={`/dashboard/buildings/${building.id}`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full justify-center"
              >
                <Eye className="h-5 w-5" />
                🔐 View Building
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      ) : searchTerm ? (
        /* No Search Results */
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No buildings found
          </h2>
          <p className="text-gray-600 mb-6">
            No buildings match your search for "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Empty State - No Buildings */
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            No Buildings Yet
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get started by adding your first building to your portfolio. 
            You'll be able to manage units, compliance, and communications all in one place.
          </p>
          <Link 
            href="/dashboard/buildings/create"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Plus className="h-6 w-6" />
            Create Your First Building
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      )}
    </div>
  )
}

// Client component that fetches data and renders the buildings list
export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  // Fetch buildings and units on component mount
  React.useEffect(() => {
    const fetchBuildingsAndUnits = async () => {
      try {
        // Fetch buildings
        const { data: buildingsData, error: buildingsError } = await supabase
          .from('buildings')
          .select('*')
          .order('name')

        if (buildingsError) {
          console.error('Error fetching buildings:', buildingsError)
          setError('Unable to load your buildings at this time. Please try again later.')
          return
        }

        // Fetch all units to calculate live unit counts
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('id, building_id')

        if (unitsError) {
          console.error('Error fetching units:', unitsError)
          // Continue with buildings even if units fail to load
        }

        // Calculate unit count for each building
        const buildingsWithUnitCounts = (buildingsData || []).map(building => {
          const unitCount = unitsData ? unitsData.filter(unit => unit.building_id === building.id).length : 0
          return {
            ...building,
            liveUnitCount: unitCount
          }
        })

        setBuildings(buildingsWithUnitCounts)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Unable to load your buildings at this time. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchBuildingsAndUnits()
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Loading Buildings...
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Please wait while we load your properties
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Error Loading Buildings
          </h1>
          <p className="text-lg text-gray-600">
            {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Building2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Your Buildings
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Manage all properties under your agency
        </p>
      </div>

      {/* Buildings List */}
      <BuildingsList initialBuildings={buildings} />

      {/* CTA Section */}
      {buildings && buildings.length > 0 && (
        <div className="text-center">
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Plus className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Add Another Building
            </h2>
            <p className="text-gray-600 mb-6">
              Expand your portfolio by adding more properties to manage.
            </p>
            <Link 
              href="/dashboard/buildings/create"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <Plus className="h-5 w-5" />
              Add New Building
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
} 