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
  const [searchQuery, setSearchQuery] = useState('')
  const [realBuildings, setRealBuildings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

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
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Building Management
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Manage your property portfolio, track compliance, and oversee building operations from one central dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/30"
            >
              <Plus className="h-5 w-5 mr-2 inline" />
              Create New Building
            </button>
            <button className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/30">
              <Sparkles className="h-5 w-5 mr-2 inline" />
              AI Building Assistant
            </button>
          </div>
        </div>
      </section>

      {/* Search and Create Section */}
      <div className="max-w-4xl mx-auto px-6 mb-12">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search buildings by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-3 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-all duration-300 bg-white shadow-lg hover:shadow-xl hover:shadow-[#4f46e5]/10 focus:shadow-2xl focus:shadow-[#4f46e5]/20"
            />
          </div>
          
          {/* Create New Building Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4f46e5]/90 hover:to-[#a855f7]/90 text-white border-0 shadow-2xl hover:shadow-3xl hover:shadow-[#4f46e5]/40 transition-all duration-300 rounded-2xl transform hover:-translate-y-1 hover:scale-[1.02] font-bold px-8 py-4 text-lg"
          >
            <Plus className="h-5 w-5 mr-2 inline" />
            Create New Building
            <div className="ml-3 inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
              Coming Soon
            </div>
          </button>
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

                {/* Status Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <div className="bg-gradient-to-r from-indigo-200 to-indigo-300 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full border-2 border-indigo-300 shadow-lg">
                    Real Building
                  </div>
                </div>

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
                      href="/compliance"
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-xl hover:shadow-2xl hover:shadow-emerald-500/40 py-3 transform hover:-translate-y-1 hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      View Compliance
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {/* Demo Building Tiles */}
            {dummyBuildings.map((building) => (
              <div
                key={building.id}
                className="group bg-white rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl hover:shadow-gray-500/20 transition-all duration-500 overflow-hidden transform hover:scale-[1.02] relative"
              >
                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-500/8 to-gray-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>
                
                {/* HRB Badge */}
                {building.is_hrb && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xl">
                      HRB
                    </div>
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <div className="bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 text-xs font-bold px-3 py-1 rounded-full border-2 border-gray-300 shadow-lg">
                    Demo Building
                  </div>
                </div>

                {/* Building Icon */}
                <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                  <Building2 className="h-10 w-10 text-white" />
                </div>

                {/* Building Info */}
                <div className="px-6 pb-6 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{building.name}</h3>
                  <p className="text-gray-600 mb-4 font-medium">{building.address}</p>
                  <div className="text-gray-700 font-semibold mb-6">{building.units} Units</div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl py-3 cursor-not-allowed opacity-75"
                      disabled
                    >
                      Demo Only
                    </button>
                    <button
                      className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl py-3 cursor-not-allowed opacity-75"
                      disabled
                    >
                      Demo Only
                    </button>
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

      {/* Enhanced CTA Section - Matching Landing Page Style */}
      <section className="hero-banner py-16 mx-6" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
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