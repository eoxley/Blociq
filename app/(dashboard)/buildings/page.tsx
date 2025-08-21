'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
  Sparkles
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'

// Hardcoded dummy buildings for demo purposes
const dummyBuildings = [
  { 
    id: 'dummy-1', 
    name: "Kingsmere House", 
    address: "Wimbledon, London SW19", 
    units: 42,
    isDummy: true,
    is_hrb: true
  },
  { 
    id: 'dummy-2', 
    name: "Harbour View", 
    address: "Brighton Seafront, BN1", 
    units: 28,
    isDummy: true,
    is_hrb: true
  },
  { 
    id: 'dummy-3', 
    name: "Maple Row", 
    address: "Guildford, Surrey GU1", 
    units: 16,
    isDummy: true
  },
  { 
    id: 'dummy-4', 
    name: "Riverside Court", 
    address: "Kingston upon Thames, KT1", 
    units: 35,
    isDummy: true
  },
  { 
    id: 'dummy-5', 
    name: "Oakwood Gardens", 
    address: "Epsom, Surrey KT18", 
    units: 24,
    isDummy: true,
    is_hrb: true
  },
  { 
    id: 'dummy-6', 
    name: "Victoria Heights", 
    address: "Croydon, London CR0", 
    units: 31,
    isDummy: true
  },
  { 
    id: 'dummy-7', 
    name: "Parkview Apartments", 
    address: "Sutton, Surrey SM1", 
    units: 19,
    isDummy: true
  },
  { 
    id: 'dummy-8', 
    name: "The Regency", 
    address: "Worthing, West Sussex BN11", 
    units: 22,
    isDummy: true
  },
  { 
    id: 'dummy-9', 
    name: "Marina Point", 
    address: "Portsmouth, Hampshire PO1", 
    units: 38,
    isDummy: true
  },
  { 
    id: 'dummy-10', 
    name: "St. James Court", 
    address: "Southampton, Hampshire SO14", 
    units: 27,
    isDummy: true
  },
  { 
    id: 'dummy-11', 
    name: "The Grand", 
    address: "Bournemouth, Dorset BH1", 
    units: 33,
    isDummy: true
  },
  { 
    id: 'dummy-12', 
    name: "Cliffside Manor", 
    address: "Eastbourne, East Sussex BN21", 
    units: 15,
    isDummy: true,
    is_hrb: true
  },
  { 
    id: 'dummy-13', 
    name: "Seaside Plaza", 
    address: "Hastings, East Sussex TN34", 
    units: 29,
    isDummy: true
  },
  { 
    id: 'dummy-14', 
    name: "Royal Gardens", 
    address: "Chichester, West Sussex PO19", 
    units: 21,
    isDummy: true
  }
]

// Client component for the buildings list with search functionality
function BuildingsList() {
  const [searchTerm, setSearchTerm] = useState('')
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
          // Transform real buildings to match the expected format
          const transformedBuildings = (data.buildings || []).map((building: any) => ({
            id: building.id.toString(),
            name: building.name,
            address: building.address,
            units: building.unit_count || 0, // Use dynamically calculated unit_count
            unit_count: building.unit_count || 0, // Also store as unit_count for consistency
            isDummy: false,
            created_at: building.created_at
          }))
          setRealBuildings(transformedBuildings)
        } else {
          console.error('Failed to fetch real buildings:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching real buildings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRealBuildings()
  }, [])

  // Combine real and dummy buildings
  const combinedBuildings = useMemo(() => {
    return [...realBuildings, ...dummyBuildings]
  }, [realBuildings])

  // Filter buildings based on search term (case-insensitive)
  const filteredBuildings = useMemo(() => {
    if (!searchTerm.trim()) return combinedBuildings
    
    return combinedBuildings.filter(building => {
      const searchLower = searchTerm.toLowerCase()
      const nameMatch = building.name.toLowerCase().includes(searchLower)
      const addressMatch = building.address.toLowerCase().includes(searchLower)
      return nameMatch || addressMatch
    })
  }, [combinedBuildings, searchTerm])

  return (
    <div>
      {/* Enhanced Hero Banner - BlocIQ Landing Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Manage Your Buildings
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Track compliance, view documents, and manage your portfolio effortlessly.
            </p>
            <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-white/90">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {isLoading ? 'Loading buildings...' : `Showing ${realBuildings.length} real + ${dummyBuildings.length} demo buildings`}
                </span>
              </div>
            </div>
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
      <div className="max-w-8xl mx-auto px-4 lg:px-6 xl:px-8 py-12">
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
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white shadow-lg hover:shadow-xl hover:shadow-blue-500/10 focus:shadow-2xl focus:shadow-blue-500/20"
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
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 shadow-2xl hover:shadow-3xl hover:shadow-blue-500/40 transition-all duration-300 rounded-2xl transform hover:-translate-y-1 hover:scale-[1.02] font-bold"
            >
              <Plus className="h-6 w-6 mr-2" />
              Create New Building
              <ArrowRight className="h-5 w-5 ml-2" />
            </BlocIQButton>
            {/* Coming Soon Badge */}
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xl border-2 border-white">
              COMING SOON
            </div>
          </div>
        </div>

        {/* Search Results Count */}
        {searchTerm && (
          <div className="mb-8 text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl px-6 py-3 inline-block border-2 border-blue-200 shadow-lg">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-600" />
              <span className="font-bold text-blue-800">
                Showing {filteredBuildings.length} of {combinedBuildings.length} buildings
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Buildings Grid - Enhanced Landing Page Style */}
      {filteredBuildings.length > 0 ? (
        <div className="max-w-8xl mx-auto px-4 lg:px-6 xl:px-8 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {filteredBuildings.map((building) => (
              <div 
                key={building.id}
                className="relative bg-white rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-500 transform hover:scale-[1.02] text-center group overflow-hidden"
              >
                {/* HRB Badge */}
                {building.is_hrb && (
                  <div 
                    className="absolute top-4 right-4 bg-gradient-to-br from-red-600 to-orange-500 text-white text-xs font-bold px-3 py-2 rounded-full shadow-2xl hover:scale-110 transition-transform duration-200 z-10 border-2 border-white"
                    title="High-Risk Building (HRB)"
                  >
                    🛡️ HRB
                  </div>
                )}
                
                {/* Building Status Badge */}
                <div className="absolute top-4 left-4 z-10">
                  {building.isDummy ? (
                    <span className="bg-gradient-to-r from-indigo-200 to-purple-200 text-indigo-800 text-xs px-3 py-2 rounded-full font-bold border-2 border-indigo-300 shadow-lg backdrop-blur-sm">
                      ✨ Demo
                    </span>
                  ) : (
                    <span className="bg-gradient-to-r from-emerald-200 to-green-200 text-emerald-800 text-xs px-3 py-2 rounded-full font-bold border-2 border-emerald-300 shadow-lg backdrop-blur-sm">
                      🏢 Real
                    </span>
                  )}
                </div>

                <div className="p-8">
                  {/* Building Icon */}
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl mx-auto group-hover:scale-110 transition-transform duration-500 group-hover:shadow-blue-500/40">
                    <Building2 className="h-12 w-12 text-white" />
                  </div>

                  {/* Building Name */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-200 leading-tight">
                      {building.name}
                    </h3>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-3 mb-6 justify-center">
                    <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 leading-relaxed text-sm font-medium">
                      {building.address}
                    </p>
                  </div>

                  {/* Unit Count */}
                  <div className="flex items-center gap-3 mb-8 justify-center">
                    <Users className="h-5 w-5 text-purple-500" />
                    <p className="text-sm text-gray-700 font-semibold">
                      {(() => {
                        // Use dynamically calculated unit count from units table
                        const unitCount = building.units || building.unit_count || 0
                        return `${unitCount} units`
                      })()}
                    </p>
                  </div>

                  {/* Action Buttons - Enhanced with Better Visual Hierarchy */}
                  <div className="space-y-4">
                    {building.isDummy ? (
                      // Dummy buildings - enhanced styling with better visibility
                      <div className="space-y-3">
                        <button 
                          className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 px-6 py-4 rounded-2xl font-bold text-base cursor-not-allowed opacity-90 border-2 border-gray-300 shadow-md hover:shadow-lg transition-all duration-200"
                          disabled
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Eye className="h-4 w-4" />
                            Demo Only
                          </div>
                        </button>
                        <button 
                          className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 px-6 py-4 rounded-2xl font-bold text-base cursor-not-allowed opacity-90 border-2 border-gray-300 shadow-md hover:shadow-lg transition-all duration-200"
                          disabled
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Shield className="h-4 w-4" />
                            Demo Only
                          </div>
                        </button>
                      </div>
                    ) : (
                      // Real buildings - enhanced clickable buttons with better visual hierarchy
                      <>
                        <BlocIQButton 
                          asChild
                          size="sm"
                          className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-xl hover:shadow-2xl hover:shadow-blue-500/40 transform hover:-translate-y-1 hover:scale-[1.02]"
                        >
                          <Link href={`/buildings/${building.id}`}>
                            <div className="flex items-center justify-center gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </div>
                          </Link>
                        </BlocIQButton>
                        <BlocIQButton 
                          asChild
                          size="sm"
                          className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-xl hover:shadow-2xl hover:shadow-emerald-500/40 transform hover:-translate-y-1 hover:scale-[1.02]"
                        >
                          <Link href={`/buildings/${building.id}/compliance`}>
                            <div className="flex items-center justify-center gap-2">
                              <Shield className="h-4 w-4" />
                              View Compliance
                            </div>
                          </Link>
                        </BlocIQButton>
                      </>
                    )}
                  </div>
                </div>

                {/* Enhanced Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-purple-500/8 to-pink-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>
                
                {/* Subtle Border Glow on Hover */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500/20 rounded-3xl transition-all duration-500 pointer-events-none"></div>
              </div>
            ))}
          </div>
        </div>
      ) : searchTerm ? (
        /* No Search Results - Enhanced */
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border-2 border-blue-200">
              <Search className="h-12 w-12 text-blue-600" />
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
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 shadow-2xl hover:shadow-3xl hover:shadow-blue-500/40 transition-all duration-300 rounded-2xl transform hover:-translate-y-1 hover:scale-[1.02] font-bold"
            >
              <Search className="h-5 w-5 mr-2" />
              Clear Search
            </BlocIQButton>
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

      {/* Enhanced CTA Section - Matching Landing Page Style */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-3xl p-12 shadow-2xl border-2 border-gray-100 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
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
                className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl cursor-not-allowed opacity-75 hover:opacity-75 transition-all duration-300 font-bold text-lg shadow-2xl transform"
              >
                <Plus className="h-6 w-6" />
                Add New Building
                <ArrowRight className="h-5 w-5" />
              </button>
              {/* Coming Soon Badge */}
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xl border-2 border-white">
                COMING SOON
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 