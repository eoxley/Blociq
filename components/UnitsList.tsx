'use client'

import { useState, useMemo } from 'react'
import { Search, Eye, Home, User, Mail, Phone, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'

interface Leaseholder {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

interface Lease {
  id: string
  start_date: string | null
  expiry_date: string | null
  doc_type: string | null
  is_headlease: boolean | null
}

interface Unit {
  id: number
  unit_number: string
  floor: string | null
  type: string
  building_id: number
  leaseholder_id: string | null
  leaseholders: Leaseholder[] | null
  leases: Lease[] | null
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
      if (unit.unit_number?.toLowerCase().includes(searchLower)) return true
      
      // Search by leaseholder name
      if (unit.leaseholders && unit.leaseholders.length > 0) {
        const leaseholder = unit.leaseholders[0]
        if (leaseholder.name && leaseholder.name.toLowerCase().includes(searchLower)) return true
        if (leaseholder.email && leaseholder.email.toLowerCase().includes(searchLower)) return true
      }
      
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
          placeholder="Search units by number, leaseholder name, or email..."
        />
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="text-sm text-gray-600">
          Found {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} matching "{searchTerm}"
        </div>
      )}

      {/* Units List */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {filteredUnits.length > 0 ? (
          filteredUnits.map((unit) => {
            const leaseholder = unit.leaseholders && unit.leaseholders.length > 0 ? unit.leaseholders[0] : null
            const lease = unit.leases && unit.leases.length > 0 ? unit.leases[0] : null

            return (
              <div 
                key={unit.id} 
                className="border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 bg-white p-6"
              >
                <div className="flex items-start justify-between">
                  {/* Unit Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Home className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          Unit {unit.unit_number}
                        </h3>
                        {unit.type && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {unit.type}
                          </span>
                        )}
                      </div>
                      
                      {unit.floor && (
                        <p className="text-sm text-gray-600 mb-2">
                          Floor {unit.floor}
                        </p>
                      )}

                      {/* Leaseholder Information */}
                      {leaseholder ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-900">
                              {leaseholder.name || 'Unnamed Leaseholder'}
                            </span>
                          </div>
                          
                          {leaseholder.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              <a 
                                href={`mailto:${leaseholder.email}`}
                                className="text-blue-600 hover:underline"
                              >
                                {leaseholder.email}
                              </a>
                            </div>
                          )}
                          
                          {leaseholder.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              <a 
                                href={`tel:${leaseholder.phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {leaseholder.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <User className="h-4 w-4" />
                          <span>No leaseholder assigned</span>
                        </div>
                      )}

                      {/* Lease Information */}
                      {lease && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">Lease Information</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                            {lease.start_date && (
                              <div>
                                <span className="font-medium">Start:</span> {new Date(lease.start_date).toLocaleDateString('en-GB')}
                              </div>
                            )}
                            {lease.expiry_date && (
                              <div>
                                <span className="font-medium">Expiry:</span> {new Date(lease.expiry_date).toLocaleDateString('en-GB')}
                              </div>
                            )}
                          </div>
                          
                          {lease.doc_type && (
                            <div className="text-xs text-gray-500 mt-1">
                              <span className="font-medium">Type:</span> {lease.doc_type}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <Link
                      href={`/buildings/${buildingId}/units/${unit.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors duration-200"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Link>
                    
                    {leaseholder && (
                      <Link
                        href={`/units/${unit.id}/leaseholder`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                      >
                        <User className="h-4 w-4" />
                        Leaseholder Info
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })
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