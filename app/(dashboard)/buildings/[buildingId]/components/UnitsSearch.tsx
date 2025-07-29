'use client'

import { useState, useMemo } from 'react'
import { Search, Home } from 'lucide-react'
import Link from 'next/link'

interface Unit {
  id: string
  unit_number: string
  type: string | null
  floor: string | null
  building_id: string
  leaseholder_id: string | null
  created_at: string | null
  leaseholders?: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
    is_director: boolean | null
    director_since: string | null
    director_notes: string | null
  } | null
}

interface UnitsSearchProps {
  units: Unit[]
  buildingId: string
}

export default function UnitsSearch({ units, buildingId }: UnitsSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter units based on search term
  const filteredUnits = useMemo(() => {
    if (!searchTerm.trim()) return units

    const searchLower = searchTerm.toLowerCase()
    return (units || []).filter(unit => {
      const unitNumber = unit.unit_number?.toLowerCase() || ''
      const leaseholderName = unit.leaseholders?.name?.toLowerCase() || ''
      const leaseholderEmail = unit.leaseholders?.email?.toLowerCase() || ''

      return unitNumber.includes(searchLower) || 
             leaseholderName.includes(searchLower) || 
             leaseholderEmail.includes(searchLower)
    })
  }, [units, searchTerm])

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
            />
          </div>
          <button className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Add Unit
          </button>
        </div>
      </div>

      {/* Units Grid */}
      {filteredUnits.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredUnits.map((unit) => (
            <Link
              key={unit.id}
              href={`/buildings/${buildingId}/units/${unit.id}`}
              className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors border border-gray-200"
            >
              <div className="text-center">
                <Home className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <div className="font-semibold text-gray-900">{unit.unit_number}</div>
                {unit.leaseholders?.name && (
                  <div className="text-sm text-gray-600 mt-1">{unit.leaseholders.name}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : searchTerm ? (
        <div className="text-center py-12">
          <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No units found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search terms.</p>
          <button 
            onClick={() => setSearchTerm('')}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="text-center py-12">
          <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No units found</h3>
          <p className="text-gray-600 mb-4">Add your first unit to get started.</p>
          <button className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Add Unit
          </button>
        </div>
      )}
    </div>
  )
}