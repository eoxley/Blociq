'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { 
  Building2, 
  Plus,
  Eye,
  ArrowRight,
  Search,
  Shield,
  Sparkles
} from 'lucide-react'

// Dummy data removed - only showing live buildings from database

// Client component for the buildings list with search functionality
function BuildingsList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [realBuildings, setRealBuildings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real buildings from Supabase
  useEffect(() => {
    const fetchRealBuildings = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/list-buildings')
        
        if (response.ok) {
          const data = await response.json()
          // Ensure data and data.buildings are properly structured
          const buildingsArray = Array.isArray(data?.buildings) ? data.buildings : []
          // Transform real buildings to match the expected format
          const transformedBuildings = buildingsArray.map((building: any) => ({
            id: building.id.toString(),
            name: building.name || 'Unknown Building',
            address: building.address || 'Unknown Address',
            units: building.unit_count || 0, // Use dynamically calculated unit_count
            unit_count: building.unit_count || 0, // Also store as unit_count for consistency
            isDummy: false,
            created_at: building.created_at
          }))
          setRealBuildings(transformedBuildings)
        } else {
          console.error('Failed to fetch real buildings:', response.statusText)
          setRealBuildings([]) // Set empty array on error
        }
      } catch (error) {
        console.error('Error fetching real buildings:', error)
        setRealBuildings([]) // Set empty array on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchRealBuildings()
  }, [])

  // Only show real buildings from database
  const combinedBuildings = useMemo(() => {
    return realBuildings
  }, [realBuildings])

  // Filter buildings based on search term (case-insensitive)
  const filteredBuildings = useMemo(() => {
    if (!searchQuery.trim()) return combinedBuildings
    
    return combinedBuildings.filter(building => {
      const searchLower = searchQuery.toLowerCase()
      const nameMatch = building.name.toLowerCase().includes(searchLower)
      const addressMatch = building.address.toLowerCase().includes(searchLower)
      return nameMatch || addressMatch
    })
  }, [combinedBuildings, searchQuery])

  // Calculate HRB and total units
  const hrbBuildings = useMemo(() => {
    return combinedBuildings.filter(building => building.is_hrb)
  }, [combinedBuildings])

  const totalUnits = useMemo(() => {
    return combinedBuildings.reduce((sum, building) => sum + (building.units || building.unit_count || 0), 0)
  }, [combinedBuildings])

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Building Management
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Manage your property portfolio, track compliance, and oversee building operations from one central dashboard.
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="text-3xl font-bold text-gray-900 mb-2">{combinedBuildings.length}</div>
            <div className="text-gray-600 text-sm">Total Buildings</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="text-3xl font-bold text-gray-900 mb-2">{hrbBuildings.length}</div>
            <div className="text-gray-600 text-sm">High-Risk Buildings</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="text-3xl font-bold text-gray-900 mb-2">{totalUnits}</div>
            <div className="text-gray-600 text-sm">Total Units</div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto px-6 mb-12">
        <div className="flex justify-center">
          {/* Search Bar */}
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search buildings by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-3 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-all duration-300 bg-white shadow-lg hover:shadow-xl hover:shadow-[#4f46e5]/10 focus:shadow-2xl focus:shadow-[#4f46e5]/20 text-center"
            />
          </div>
        </div>
      </div>

      {/* Search Results Count */}
      {searchQuery && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <div className="text-sm text-gray-600 bg-gradient-to-r from-[#4f46e5]/10 to-[#a855f7]/10 rounded-2xl px-6 py-3 inline-block border-2 border-[#4f46e5]/20 shadow-lg">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[#4f46e5]" />
              <span className="font-bold text-[#4f46e5]">
                Showing {filteredBuildings.length} of {combinedBuildings.length} buildings
              </span>
            </div>
          </div>
        </div>
      )}

      {/* No Search Results Section */}
      {searchQuery && filteredBuildings.length === 0 && (
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-gray-200 shadow-lg">
              <Search className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No buildings found</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              No buildings match your search for "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4f46e5]/90 hover:to-[#a855f7]/90 text-white border-0 shadow-2xl hover:shadow-3xl hover:shadow-[#4f46e5]/40 transition-all duration-300 rounded-2xl transform hover:-translate-y-1 hover:scale-[1.02] font-bold px-8 py-4 text-lg"
            >
              Clear Search
            </button>
          </div>
        </div>
      )}

      {/* Buildings Grid - Enhanced Landing Page Style */}
      {filteredBuildings.length > 0 ? (
        <div className="max-w-8xl mx-auto px-4 lg:px-6 xl:px-8 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {/* Real Building Tiles */}
            {realBuildings.map((building) => (
              <div
                key={building.id}
                className="group bg-white rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 overflow-hidden transform hover:scale-[1.02] relative"
              >
                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#4f46e5]/8 to-[#a855f7]/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>
                
                {/* HRB Badge */}
                {building.is_hrb && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xl">
                      HRB
                    </div>
                  </div>
                )}



                {/* Building Icon */}
                <div className="w-24 h-24 bg-gradient-to-br from-[#4f46e5] to-[#a855f7] rounded-3xl flex items-center justify-center mb-8 shadow-2xl mx-auto group-hover:scale-110 transition-transform duration-500 group-hover:shadow-blue-500/40">
                  <Building2 className="h-12 w-12 text-white" />
                </div>

                {/* Building Info */}
                <div className="px-6 pb-6 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{building.name}</h3>
                  <p className="text-gray-600 mb-4 font-medium">{building.address}</p>
                  <div className="text-gray-700 font-semibold mb-6">{building.unit_count} Units</div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Link
                      href={`/buildings/${building.id}`}
                      className="w-full bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4f46e5]/90 hover:to-[#a855f7]/90 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-xl hover:shadow-2xl hover:shadow-blue-500/40 py-3 transform hover:-translate-y-1 hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Link>
                    <Link
                      href={`/buildings/${building.id}/compliance`}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-xl hover:shadow-2xl hover:shadow-emerald-500/40 py-3 transform hover:-translate-y-1 hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      View Compliance
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// Main component that renders the buildings list
export default function BuildingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Buildings List */}
      <BuildingsList />

    </div>
  )
} 