'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Building2, MapPin, Users, ArrowRight, Search, Shield, Plus } from 'lucide-react'

// Define the Building type based on the database schema
type Building = {
  id: number
  name: string
  address: string | null
  unit_count: number | null
  created_at: string | null
  demo_ready?: boolean
  units?: any[]
  leases?: any[]
}

interface BuildingsClientProps {
  buildings: Building[]
}

export default function BuildingsClient({ buildings }: BuildingsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter buildings based on search term
  const filteredBuildings = buildings.filter(building => {
    const searchLower = searchTerm.toLowerCase()
    return (
      building.name.toLowerCase().includes(searchLower) ||
      (building.address && building.address.toLowerCase().includes(searchLower))
    )
  })

  if (buildings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
          <Building2 className="h-12 w-12 text-teal-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">No buildings found</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Get started by adding your first building to begin managing your property portfolio.
        </p>
        <button className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200 transform hover:scale-105 shadow-lg">
          <Plus className="h-5 w-5 inline mr-2" />
          Add First Building
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Your Buildings</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Manage your property portfolio with comprehensive tools for compliance, communication, and maintenance tracking.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search buildings by name or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-sm text-lg"
        />
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm">
            {filteredBuildings.length === 0 ? (
              <span>No buildings found matching "{searchTerm}"</span>
            ) : (
              <span>Showing {filteredBuildings.length} of {buildings.length} buildings</span>
            )}
          </div>
        </div>
      )}

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredBuildings.map((building) => {
          return (
            <Link
              key={building.id}
              href={`/buildings/${building.id}`}
              className="group block relative"
            >
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden transform hover:scale-105">
                {/* Coming Soon Badge */}
                {building.demo_ready === false && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                      🚧 Coming Soon
                    </span>
                  </div>
                )}

                {/* Building Icon Header */}
                <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-blue-600 p-6 text-white">
                  <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 mx-auto backdrop-blur-sm">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-center group-hover:text-teal-100 transition-colors duration-200">
                    {building.name}
                  </h3>
                </div>
                
                {/* Building Details */}
                <div className="p-6">
                  {/* Address */}
                  {building.address && (
                    <div className="flex items-start space-x-3 mb-4">
                      <MapPin className="h-5 w-5 text-teal-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {building.address}
                      </p>
                    </div>
                  )}
                  
                  {/* Unit Count */}
                  <div className="flex items-center space-x-3 mb-6">
                    <Users className="h-5 w-5 text-teal-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {building.unit_count || 0} {building.unit_count === 1 ? 'unit' : 'units'}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {/* View Details Button */}
                    <div className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-4 py-3 rounded-xl transition-all duration-200 transform group-hover:scale-105 shadow-md">
                      <span className="text-sm font-semibold">View Details</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                    
                    {/* Compliance Management Button */}
                    <Link
                      href={`/buildings/${building.id}/compliance/tracker`}
                      className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-xl transition-all duration-200 transform group-hover:scale-105 shadow-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-semibold">Compliance</span>
                    </Link>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* No Results Message */}
      {searchTerm && filteredBuildings.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Search className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No matching buildings</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Try adjusting your search terms or browse all buildings to find what you're looking for.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Add Building CTA */}
      {!searchTerm && (
        <div className="text-center pt-8 border-t border-gray-200">
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-2xl p-8 max-w-md mx-auto">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Add Another Building</h3>
            <p className="text-gray-600 mb-4">
              Expand your property portfolio and manage more buildings efficiently.
            </p>
            <button className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200 transform hover:scale-105 shadow-lg">
              Add Building
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 