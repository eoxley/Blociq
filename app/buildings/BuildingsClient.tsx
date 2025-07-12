'use client'

import { Building2, MapPin, Users, ArrowRight } from 'lucide-react'

// Define the Building type based on the database schema
type Building = {
  id: number
  name: string
  address: string | null
  unit_count: number | null
  created_at: string | null
}

interface BuildingsClientProps {
  buildings: Building[]
}

export default function BuildingsClient({ buildings }: BuildingsClientProps) {
  if (buildings.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No buildings found</h3>
        <p className="text-gray-500">Get started by adding your first building.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {buildings.map((building) => (
        <div
          key={building.id}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100 overflow-hidden group"
        >
          <div className="p-6">
            {/* Building Icon */}
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg mb-4">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            
            {/* Building Name */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors duration-200">
              {building.name}
            </h3>
            
            {/* Address */}
            {building.address && (
              <div className="flex items-start space-x-2 mb-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600 leading-relaxed">
                  {building.address}
                </p>
              </div>
            )}
            
            {/* Unit Count */}
            <div className="flex items-center space-x-2 mb-4">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {building.unit_count || 0} {building.unit_count === 1 ? 'unit' : 'units'}
              </span>
            </div>
            
            {/* View More Button */}
            <button className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 group-hover:shadow-md">
              <span className="text-sm font-medium">View Details</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
} 