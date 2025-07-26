'use client'

import { useState, useMemo } from 'react'
import { Search, Eye, Home } from 'lucide-react'
import Link from 'next/link'

interface Unit {
  id: string
  unit_number: string
  floor: string | null
  type: string
  address?: string
}

interface UnitsListProps {
  units: Unit[]
  buildingId: string
}

export default function UnitsList({ units, buildingId }: UnitsListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter units based on search term
  const filteredUnits = useMemo(() => {
    if (!searchTerm.trim()) return units

    const searchLower = searchTerm.toLowerCase()
    
    return units.filter(unit => {
      // Search by unit number
      if (unit.unit_number.toLowerCase().includes(searchLower)) return true
      
      // Search by address if available
      if (unit.address && unit.address.toLowerCase().includes(searchLower)) return true
      
      return false
    })
  }, [units, searchTerm])

  if (units.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Home className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">No units found</h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          No units are currently assigned to this building. Units will appear here once they are added to the building.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 placeholder-gray-500"
          placeholder="Search units by number or address..."
        />
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="text-sm text-gray-600">
          Found {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} matching "{searchTerm}"
        </div>
      )}

      {/* Units List */}
      <div className="space-y-3">
        {filteredUnits.length > 0 ? (
          filteredUnits.map((unit) => (
            <div 
              key={unit.id} 
              className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 bg-white"
            >
              {/* Unit Info */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {unit.unit_number}
                  </div>
                  {unit.address && (
                    <div className="text-sm text-gray-600">
                      {unit.address}
                    </div>
                  )}
                </div>
              </div>

              {/* View Leaseholder Info Link */}
              <Link
                href={`/units/${unit.id}/leaseholder`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors duration-200"
              >
                <Eye className="h-4 w-4" />
                View Leaseholder Info
              </Link>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No units found matching your search</p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-center pt-4 border-t border-gray-200">
        <span className="text-sm text-gray-600">
          Showing {filteredUnits.length} of {units.length} units
        </span>
      </div>
    </div>
  )
} 