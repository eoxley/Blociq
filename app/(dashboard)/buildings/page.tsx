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
  AlertCircle
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent } from '@/components/ui/blociq-card'
import PageHero from '@/components/PageHero'

// Client component for the buildings list with search functionality
function BuildingsList({ initialBuildings }: { initialBuildings: any[] }) {
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
      {/* Hero Banner */}
      <PageHero
        title="Property Buildings"
        subtitle="Manage and monitor all your property buildings in one place"
        icon={<Building2 className="h-8 w-8 text-white" />}
      />

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
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#008C8F] focus:border-transparent transition-all bg-white shadow-sm hover:shadow-md"
              />
            </div>
          </div>

          {/* Create New Building Button */}
          <div className="relative">
            <BlocIQButton
              onClick={(e) => {
                e.preventDefault();
                // Show coming soon message
                alert('Building creation feature coming soon!');
              }}
              size="lg"
              variant="outline"
              className="cursor-not-allowed opacity-75"
            >
              <Plus className="h-6 w-6" />
              Create New Building
              <ArrowRight className="h-5 w-5" />
            </BlocIQButton>
            {/* Coming Soon Badge */}
            <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
              COMING SOON
            </div>
          </div>
        </div>

        {/* Search Results Count */}
        {searchTerm && (
          <div className="mt-6 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2 inline-block">
            Showing {filteredBuildings.length} of {validBuildings.length} buildings
          </div>
        )}
      </div>

      {/* Buildings Grid - Enhanced Landing Page Style */}
      {filteredBuildings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBuildings.map((building) => (
            <BlocIQCard 
              key={building.id}
              variant="elevated"
              className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-center group"
            >
              <BlocIQCardContent className="p-8">
                {/* Building Icon */}
                <div className="w-20 h-20 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-2xl flex items-center justify-center mb-8 shadow-lg mx-auto group-hover:scale-105 transition-transform duration-300">
                  <Building2 className="h-10 w-10 text-white" />
                </div>

                {/* Building Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  {building.name}
                </h3>

                {/* Address */}
                {building.address && (
                  <div className="flex items-start gap-3 mb-6 justify-center">
                    <MapPin className="h-5 w-5 text-[#008C8F] mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {building.address}
                    </p>
                  </div>
                )}

                {/* Live Unit Count */}
                <div className="flex items-center gap-3 mb-8 justify-center">
                  <Users className="h-5 w-5 text-[#008C8F]" />
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

                {/* Action Buttons */}
                <div className="space-y-3">
                  <BlocIQButton 
                    asChild
                    size="sm"
                    className="w-full"
                  >
                    <Link href={`/buildings/${building.id}`}>
                      <Eye className="h-4 w-4" />
                      View Details
                    </Link>
                  </BlocIQButton>
                  <BlocIQButton 
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <Link href={`/buildings/${building.id}/compliance`}>
                      <Shield className="h-4 w-4" />
                      View Compliance
                    </Link>
                  </BlocIQButton>
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
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
            <BlocIQButton
              onClick={() => setSearchTerm('')}
              size="lg"
            >
              Clear Search
            </BlocIQButton>
        </div>
      ) : validBuildings.length === 0 ? (
        /* Empty State - No Buildings - Enhanced */
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
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
            <Link 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // Show coming soon message
                alert('Building creation feature coming soon!');
              }}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-xl cursor-not-allowed opacity-75 hover:opacity-75 transition-all duration-200 font-semibold text-lg shadow-lg transform"
            >
              <Plus className="h-6 w-6" />
              Create Your First Building
              <ArrowRight className="h-5 w-5" />
            </Link>
            {/* Coming Soon Badge */}
            <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
              COMING SOON
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
          <div className="w-16 h-16 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
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
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
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
    )
  }

  return (
    <div className="space-y-12">
      <PageHero title="Buildings" subtitle="Manage your property portfolio and building details." />
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
              <div className="relative inline-block">
                <Link 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    // Show coming soon message
                    alert('Building creation feature coming soon!');
                  }}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-xl cursor-not-allowed opacity-75 hover:opacity-75 transition-all duration-200 font-semibold text-lg shadow-lg transform"
                >
                  <Plus className="h-6 w-6" />
                  Add New Building
                  <ArrowRight className="h-5 w-5" />
                </Link>
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