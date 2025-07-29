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
        <button className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
          Add Unit
        </button>
      </div>
    )
  }

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
            />
          </div>
          <button className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Add Unit
          </button>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((unit) => (
            <Link
              key={unit.id}
              href={`/buildings/${buildingId}/units/${unit.id}`}
              className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors border border-gray-200"
            >
              <div className="text-center">
                <Home className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <div className="font-semibold text-gray-900">{unit.unit_number}</div>
                {unit.type && (
                  <div className="text-sm text-gray-600 mt-1">{unit.type}</div>
                )}
                {unit.floor && (
                  <div className="text-xs text-gray-500 mt-1">Floor {unit.floor}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}