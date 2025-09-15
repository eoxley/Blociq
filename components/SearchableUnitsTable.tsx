'use client'

import { useState, useMemo } from 'react'
import { Search, Eye, Home } from 'lucide-react'

interface Leaseholder {
  id: string
  name: string
  email: string
}

interface Unit {
  id: string
  unit_number: string
  floor: string | null
  type: string
  leaseholder_id: string | null
  leaseholders: Leaseholder[]
}

interface SearchableUnitsTableProps {
  units: Unit[]
  buildingId: string
}

export default function SearchableUnitsTable({ units, buildingId }: SearchableUnitsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter units based on search term
  const filteredUnits = useMemo(() => {
    if (!searchTerm.trim()) return units

    const searchLower = searchTerm.toLowerCase()
    
    return units.filter(unit => {
      // Search by unit number
      if (unit.unit_number && unit.unit_number.toLowerCase().includes(searchLower)) return true
      
      // Search by leaseholder name or email
      if (unit.leaseholders && unit.leaseholders.length > 0) {
        return unit.leaseholders.some(leaseholder => 
          (leaseholder.name && leaseholder.name.toLowerCase().includes(searchLower)) ||
          (leaseholder.email && leaseholder.email.toLowerCase().includes(searchLower))
        )
      }
      
      return false
    })
  }, [units, searchTerm])

  if (units.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">No units found</h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          No units are currently assigned to this building. You can view and manage units in the dedicated units page.
        </p>
        <div className="space-y-4">
          <a 
            href={`/buildings/${buildingId}/units`}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            View All Units
          </a>
        </div>
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
          placeholder="Search units by number, leaseholder name, or email..."
        />
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="text-sm text-gray-600">
          Found {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} matching "{searchTerm}"
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Table Header */}
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
              <div className="col-span-2">Unit Number</div>
              <div className="col-span-2">Floor</div>
              <div className="col-span-4">Leaseholder Name</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="bg-white divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((unit) => (
                <div key={unit.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                  {/* Unit Number */}
                  <div className="col-span-2 flex items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Home className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-gray-900 font-medium">Unit {unit.unit_number}</span>
                    </div>
                  </div>

                  {/* Floor */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-gray-700">{unit.floor || '—'}</span>
                  </div>

                  {/* Leaseholder Name */}
                  <div className="col-span-4 flex items-center">
                    {unit.leaseholders && unit.leaseholders.length > 0 ? (
                      <div className="space-y-1">
                        {unit.leaseholders.map((leaseholder) => (
                          <div key={leaseholder.id} className="text-gray-900 font-medium">
                            {leaseholder.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">No leaseholder assigned</span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="col-span-3 flex items-center">
                    {unit.leaseholders && unit.leaseholders.length > 0 ? (
                      <div className="space-y-1">
                        {unit.leaseholders.map((leaseholder) => (
                          <div key={leaseholder.id} className="text-gray-600 text-sm">
                            {leaseholder.email || '—'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end">
                    <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors duration-200">
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No units found matching your search</p>
              </div>
            )}
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {filteredUnits.length} of {units.length} units
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Units with leaseholders:</span>
                <span className="text-sm font-semibold text-teal-600">
                  {units.filter(unit => unit.leaseholders && unit.leaseholders.length > 0).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 