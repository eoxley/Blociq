'use client'

import React, { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { 
  Building2, 
  MapPin, 
  Users, 
  Plus,
  Eye,
  ArrowRight,
  Search,
  Shield,
  Loader2,
  AlertCircle,
  Clipboard,
  Sparkles
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent } from '@/components/ui/blociq-card'

// Client component for the buildings list with search functionality
function BuildingsList({ initialBuildings, isDummyData = false }: { initialBuildings: any[], isDummyData?: boolean }) {
  const [searchTerm, setSearchTerm] = useState('')

  // Ensure initialBuildings is an array and filter out any invalid entries
  const validBuildings = initialBuildings.filter(building => 
    building && typeof building === 'object' && building.id && building.name
  )

  // Filter buildings based on search term (case-insensitive)
  const filteredBuildings = useMemo(() => {
    if (!searchTerm.trim()) return validBuildings
    
    return validBuildings.filter(building => {
      const searchLower = searchTerm.toLowerCase()
      const nameMatch = building.name && typeof building.name === 'string' && building.name.toLowerCase().includes(searchLower)
      const addressMatch = building.address && typeof building.address === 'string' && building.address.toLowerCase().includes(searchLower)
      return nameMatch || addressMatch
    })
  }, [validBuildings, searchTerm])

  return (
    <div>
      {/* Enhanced Hero Banner - BlocIQ Landing Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Manage Your Buildings
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Track compliance, view documents, and manage your portfolio effortlessly.
            </p>
            {isDummyData && (
              <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-xl p-4 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 text-white/90">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-medium">Showing sample buildings for demonstration</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      {/* Search and Create Section - Enhanced */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between mb-12">
          {/* Search Bar */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search buildings by name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all bg-white shadow-sm hover:shadow-md"
              />
            </div>
          </div>

          {/* Create New Building Button - Enhanced */}
          <div className="relative">
            <BlocIQButton
              onClick={(e) => {
                e.preventDefault();
                // Show coming soon message
                alert('Building creation feature coming soon!');
              }}
              size="lg"
              className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white border-0 shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-200 rounded-xl"
            >
              <Plus className="h-6 w-6 mr-2" />
              Create New Building
              <ArrowRight className="h-5 w-5 ml-2" />
            </BlocIQButton>
            {/* Coming Soon Badge */}
            <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
              COMING SOON
            </div>
          </div>
        </div>

        {/* Search Results Count */}
        {searchTerm && (
          <div className="mb-8 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2 inline-block">
            Showing {filteredBuildings.length} of {validBuildings.length} buildings
          </div>
        )}
      </div>

      {/* Buildings Grid - Enhanced Landing Page Style */}
      {filteredBuildings.length > 0 ? (
        <div className="max-w-7xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBuildings.map((building) => (
              <div 
                key={building.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-center group overflow-hidden"
              >
                <div className="p-8">
                  {/* Building Icon */}
                  <div className="w-20 h-20 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-2xl flex items-center justify-center mb-8 shadow-lg mx-auto group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="h-10 w-10 text-white" />
                  </div>

                  {/* Building Name */}
                  <div className="mb-6">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {building.name}
                      </h3>
                      {building.isDummy && (
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                          Demo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  {building.address && (
                    <div className="flex items-start gap-3 mb-6 justify-center">
                      <MapPin className="h-5 w-5 text-[#4f46e5] mt-0.5 flex-shrink-0" />
                      <p className="text-gray-600 leading-relaxed text-sm">
                        {building.address}
                      </p>
                    </div>
                  )}

                  {/* Live Unit Count */}
                  <div className="flex items-center gap-3 mb-8 justify-center">
                    <Users className="h-5 w-5 text-[#4f46e5]" />
                    <p className="text-gray-600 font-medium">
                      {building.liveUnitCount || 0} {(building.liveUnitCount || 0) === 1 ? 'unit' : 'units'}
                    </p>
                  </div>

                  {/* No Units Message */}
                  {(building.liveUnitCount || 0) === 0 && (
                    <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        No units assigned yet
                      </p>
                    </div>
                  )}

                  {/* Action Buttons - Enhanced with BlocIQ Gradient */}
                  <div className="space-y-3">
                    <BlocIQButton 
                      asChild
                      size="sm"
                      className="w-full bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white border-0 shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-200 rounded-xl font-semibold text-base"
                    >
                      <Link href={`/buildings/${building.id}`}>
                        <Eye className="h-5 w-5 mr-2" />
                        👁 View Details
                      </Link>
                    </BlocIQButton>
                    <BlocIQButton 
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full border-[#4f46e5] text-[#4f46e5] hover:bg-[#4f46e5] hover:text-white transition-all duration-200 rounded-xl font-semibold text-base"
                    >
                      <Link href={`/buildings/${building.id}/compliance`}>
                        <Shield className="h-5 w-5 mr-2" />
                        🛡️ View Compliance
                      </Link>
                    </BlocIQButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : searchTerm ? (
        /* No Search Results - Enhanced */
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              No buildings found
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              No buildings match your search for "{searchTerm}"
            </p>
            <BlocIQButton
              onClick={() => setSearchTerm('')}
              size="lg"
              className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white border-0 shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-200 rounded-xl"
            >
              Clear Search
            </BlocIQButton>
          </div>
        </div>
      ) : validBuildings.length === 0 ? (
        /* Empty State - No Buildings - Enhanced */
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Building2 className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              No Buildings Yet
            </h2>
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Get started by adding your first building to your portfolio. 
              You'll be able to manage units, compliance, and communications all in one place with BlocIQ's intelligent platform.
            </p>
            <div className="relative inline-block">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  alert('Building creation feature coming soon!');
                }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white px-8 py-4 rounded-xl cursor-not-allowed opacity-75 hover:opacity-75 transition-all duration-200 font-semibold text-lg shadow-lg transform"
              >
                <Plus className="h-6 w-6" />
                Create Your First Building
                <ArrowRight className="h-5 w-5" />
              </button>
              {/* Coming Soon Badge */}
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                COMING SOON
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// Client component that fetches data and renders the buildings list
export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDummyData, setIsDummyData] = useState(false)

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
        console.log('Buildings data type:', typeof data.buildings)
        console.log('Buildings data is array:', Array.isArray(data.buildings))
        
        // Ensure buildings is an array and handle potential undefined values
        const buildingsData = Array.isArray(data.buildings) ? data.buildings : []
        
        console.log('Processed buildings data:', buildingsData)
        
        // Clean the data to ensure all required fields exist
        const cleanedBuildings = buildingsData.map((building: any) => ({
          id: building?.id || '',
          name: building?.name || 'Unnamed Building',
          address: building?.address || null,
          liveUnitCount: building?.liveUnitCount || 0,
          // Add any other fields that might be needed
          ...building
        }))
        
        console.log('Cleaned buildings data:', cleanedBuildings)
        setBuildings(cleanedBuildings)
        
        // Check if this is dummy data
        if (data.isDummyData) {
          setIsDummyData(true)
        }
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Loading Buildings...
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Please wait while we load your properties
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <AlertCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Error Loading Buildings
            </h1>
            <p className="text-lg text-gray-600">
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Buildings List */}
      <BuildingsList initialBuildings={buildings} isDummyData={isDummyData} />

      {/* Enhanced CTA Section - Matching Landing Page Style */}
      {buildings && buildings.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-white rounded-2xl p-12 shadow-xl border border-gray-100 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <Plus className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Add Another Building
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                Expand your portfolio by adding more properties to manage with BlocIQ's intelligent platform.
              </p>
              <div className="relative inline-block">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Building creation feature coming soon!');
                  }}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white px-8 py-4 rounded-xl cursor-not-allowed opacity-75 hover:opacity-75 transition-all duration-200 font-semibold text-lg shadow-lg transform"
                >
                  <Plus className="h-6 w-6" />
                  Add New Building
                  <ArrowRight className="h-5 w-5" />
                </button>
                {/* Coming Soon Badge */}
                <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                  COMING SOON
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
} 