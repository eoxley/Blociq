'use client'

import { useState } from 'react'
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
}

interface BuildingUnitsClientProps {
  units: Unit[]
  buildingId: string
}

export default function BuildingUnitsClient({ units, buildingId }: BuildingUnitsClientProps) {
  const [search, setSearch] = useState('')

  const filtered = units.filter((u) =>
    u.unit_number.toLowerCase().includes(search.toLowerCase())
  )

  // Debug log for development
  console.log("BuildingUnitsClient - Units received:", units)
  console.log("BuildingUnitsClient - Filtered units:", filtered)

  if (units.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No units found</h3>
        <p className="text-gray-600 mb-4">Add your first unit to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search units..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
          />
        </div>
      </div>

      {/* Units Display */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No matching units</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search terms.</p>
          <button 
            onClick={() => setSearch('')}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((unit) => (
            <Link
              key={unit.id}
              href={`/buildings/${buildingId}/units/${unit.id}`}
              className="block p-4 rounded-lg hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Home className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">{unit.unit_number}</span>
                  {unit.type && (
                    <span className="text-sm text-gray-600">({unit.type})</span>
                  )}
                  {unit.floor && (
                    <span className="text-sm text-gray-500">Floor {unit.floor}</span>
                  )}
                </div>
                <div className="text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}