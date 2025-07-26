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
  Search,
  Shield
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
      {/* Search and Create Section - Enhanced */}
      <div className="mb-16">
        <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search buildings by name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white shadow-sm hover:shadow-md"
              />
            </div>
          </div>

          {/* Create New Building Button */}
          <Link 
            href="/buildings/create"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transform hover:-translate-y-1 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            <Plus className="h-6 w-6" />
            Create New Building
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Search Results Count */}
        {searchTerm && (
          <div className="mt-6 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2 inline-block">
            Showing {filteredBuildings.length} of {initialBuildings.length} buildings
          </div>
        )}
      </div>

      {/* Buildings Grid - Enhanced Landing Page Style */}
      {filteredBuildings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBuildings.map((building) => (
            <div 
              key={building.id}
              className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-center group"
            >
              {/* Building Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg mx-auto group-hover:scale-105 transition-transform duration-300">
                <Building2 className="h-10 w-10 text-white" />
              </div>

              {/* Building Name */}
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {building.name}
              </h3>

              {/* Address */}
              {building.address && (
                <div className="flex items-start gap-3 mb-6 justify-center">
                  <MapPin className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {building.address}
                  </p>
                </div>
              )}

              {/* Live Unit Count */}
              <div className="flex items-center gap-3 mb-8 justify-center">
                <Users className="h-5 w-5 text-teal-600" />
                <p className="text-gray-600 font-medium">
                  {building.liveUnitCount || 0} {(building.liveUnitCount || 0) === 1 ? 'unit' : 'units'}
                </p>
              </div>

              {/* No Units Message */}
              {(building.liveUnitCount || 0) === 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-400 italic">
                    No units yet
                  </p>
                </div>
              )}

              {/* View Button */}
              <Link 
                href={`/buildings/${building.id}`}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full justify-center text-lg"
              >
                <Eye className="h-5 w-5" />
                View Building
                <ArrowRight className="h-4 w-4" />
              </Link>

              {/* View Compliance Link */}
              <div className="mt-4">
                <Link 
                  href={`/buildings/${building.id}/compliance`}
                  className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 rounded-full px-4 py-2 text-sm font-medium hover:bg-teal-100 transition-colors duration-200"
                >
                  <Shield className="h-4 w-4" />
                  View Compliance
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : searchTerm ? (
        /* No Search Results - Enhanced */
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Search className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            No buildings found
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            No buildings match your search for "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-lg"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Empty State - No Buildings - Enhanced */
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Building2 className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            No Buildings Yet
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Get started by adding your first building to your portfolio. 
            You'll be able to manage units, compliance, and communications all in one place with BlocIQ's intelligent platform.
          </p>
          <Link 
            href="/buildings/create"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-10 py-5 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold text-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Plus className="h-7 w-7" />
            Create Your First Building
            <ArrowRight className="h-6 w-6" />
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

  // Fetch buildings with live unit counts from the units table
  React.useEffect(() => {
    const fetchBuildings = async () => {
      try {
        // Use the new API endpoint that handles the UUID/integer mismatch
        const response = await fetch('/api/buildings')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        console.log('Buildings data:', data)
        setBuildings(data.buildings || [])
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Unable to load your buildings at this time. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchBuildings()
  }, [])

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
    <div className="space-y-12">
      {/* Buildings List */}
      <BuildingsList initialBuildings={buildings} />

      {/* Enhanced CTA Section - Matching Landing Page Style */}
      {buildings && buildings.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-white rounded-2xl p-12 shadow-xl border border-gray-100 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                <Plus className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Add Another Building
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                Expand your portfolio by adding more properties to manage with BlocIQ's intelligent platform.
              </p>
              <Link 
                href="/buildings/create"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <Plus className="h-6 w-6" />
                Add New Building
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
} 