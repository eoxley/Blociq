'use client'

import React, { useState, useMemo } from 'react'
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
    id: '1', 
    name: "Kingsmere House", 
    address: "Wimbledon, London SW19", 
    units: 42 
  },
  { 
    id: '2', 
    name: "Harbour View", 
    address: "Brighton Seafront, BN1", 
    units: 28 
  },
  { 
    id: '3', 
    name: "Maple Row", 
    address: "Guildford, Surrey GU1", 
    units: 16 
  },
  { 
    id: '4', 
    name: "Riverside Court", 
    address: "Kingston upon Thames, KT1", 
    units: 35 
  },
  { 
    id: '5', 
    name: "Oakwood Gardens", 
    address: "Epsom, Surrey KT18", 
    units: 24 
  },
  { 
    id: '6', 
    name: "Victoria Heights", 
    address: "Croydon, London CR0", 
    units: 31 
  },
  { 
    id: '7', 
    name: "Parkview Apartments", 
    address: "Sutton, Surrey SM1", 
    units: 19 
  },
  { 
    id: '8', 
    name: "The Regency", 
    address: "Worthing, West Sussex BN11", 
    units: 22 
  },
  { 
    id: '9', 
    name: "Marina Point", 
    address: "Portsmouth, Hampshire PO1", 
    units: 38 
  },
  { 
    id: '10', 
    name: "St. James Court", 
    address: "Southampton, Hampshire SO14", 
    units: 27 
  },
  { 
    id: '11', 
    name: "The Grand", 
    address: "Bournemouth, Dorset BH1", 
    units: 33 
  },
  { 
    id: '12', 
    name: "Cliffside Manor", 
    address: "Eastbourne, East Sussex BN21", 
    units: 15 
  },
  { 
    id: '13', 
    name: "Seaside Plaza", 
    address: "Hastings, East Sussex TN34", 
    units: 29 
  },
  { 
    id: '14', 
    name: "Royal Gardens", 
    address: "Chichester, West Sussex PO19", 
    units: 21 
  }
]

// Client component for the buildings list with search functionality
function BuildingsList() {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter buildings based on search term (case-insensitive)
  const filteredBuildings = useMemo(() => {
    if (!searchTerm.trim()) return dummyBuildings
    
    return dummyBuildings.filter(building => {
      const searchLower = searchTerm.toLowerCase()
      const nameMatch = building.name.toLowerCase().includes(searchLower)
      const addressMatch = building.address.toLowerCase().includes(searchLower)
      return nameMatch || addressMatch
    })
  }, [searchTerm])

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
            <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-xl p-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-white/90">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium">Showing 14 sample buildings for demonstration</span>
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
            Showing {filteredBuildings.length} of {dummyBuildings.length} buildings
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
                className="bg-white rounded-2xl shadow-lg border border-purple-200 hover:shadow-purple-200/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-center group overflow-hidden"
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
                      <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs px-3 py-1 rounded-full font-semibold border border-purple-200 shadow-sm animate-pulse">
                        ✨ Demo
                      </span>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-3 mb-6 justify-center">
                    <MapPin className="h-5 w-5 text-[#4f46e5] mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {building.address}
                    </p>
                  </div>

                  {/* Unit Count */}
                  <div className="flex items-center gap-3 mb-8 justify-center">
                    <Users className="h-5 w-5 text-[#4f46e5]" />
                    <p className="text-gray-600 font-medium">
                      {building.units} {building.units === 1 ? 'unit' : 'units'}
                    </p>
                  </div>

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
    </div>
  )
} 