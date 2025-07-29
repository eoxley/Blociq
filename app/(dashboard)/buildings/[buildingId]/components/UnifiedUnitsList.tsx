'use client'

import { useState } from 'react'
import { Home, User, Mail, Phone, Search, Crown, Plus, Eye, FileText, Calendar } from 'lucide-react'

interface Leaseholder {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  is_director?: boolean
  director_since?: string | null
  director_notes?: string | null
}

interface Unit {
  id: number
  unit_number: string
  type: string | null
  floor: string | null
  building_id: number
  leaseholder_id: string | null
  created_at: string | null
  leaseholders?: Leaseholder | null
}

interface UnifiedUnitsListProps {
  buildingId: string
}

export default function UnifiedUnitsList({ buildingId }: UnifiedUnitsListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter units based on search term
  const filteredUnits = units.filter(unit => {
    const searchLower = searchTerm.toLowerCase()
    const unitNumber = unit.unit_number.toLowerCase()
    const leaseholderName = unit.leaseholders?.name?.toLowerCase() || ''
    const leaseholderEmail = unit.leaseholders?.email?.toLowerCase() || ''

    return unitNumber.includes(searchLower) || 
           leaseholderName.includes(searchLower) || 
           leaseholderEmail.includes(searchLower)
  })

  const getDirectorBadge = (leaseholder: Leaseholder | null) => {
    if (!leaseholder?.is_director) return null
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        <Crown className="h-3 w-3 mr-1" />
        Director
      </span>
    )
  }

  const openUnitDetail = (unit: Unit) => {
    setSelectedUnit(unit)
  }

  const closeUnitDetail = () => {
    setSelectedUnit(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Units</h2>
          <p className="text-sm text-gray-600 mt-1">All units and leaseholders in this building</p>
        </div>
        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
          <Plus className="h-4 w-4 mr-2" />
          Add Unit
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search units, leaseholders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading units...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error loading units</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredUnits.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No units found' : 'No units yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms.' : 'No units have been added to this building yet.'}
          </p>
          {!searchTerm && (
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
              <Plus className="h-4 w-4 mr-2" />
              Add your first unit
            </button>
          )}
        </div>
      )}

      {/* Units List */}
      {!loading && !error && filteredUnits.length > 0 && (
        <div className="space-y-4">
          {filteredUnits.map((unit) => (
            <div 
              key={unit.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openUnitDetail(unit)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Unit Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Home className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Unit {unit.unit_number}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                        {unit.floor && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Floor:</span>
                            <span className="text-gray-700">{unit.floor}</span>
                          </span>
                        )}
                        {unit.type && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Type:</span>
                            <span className="text-gray-700">{unit.type}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Leaseholder Info */}
                  {unit.leaseholders ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {unit.leaseholders.name || 'Unnamed Leaseholder'}
                        </span>
                        {getDirectorBadge(unit.leaseholders)}
                      </div>
                      
                      {unit.leaseholders.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>{unit.leaseholders.email}</span>
                        </div>
                      )}
                      
                      {unit.leaseholders.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{unit.leaseholders.phone}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      No leaseholder assigned
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openUnitDetail(unit)
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unit Detail Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Unit {selectedUnit.unit_number} Details
                </h2>
                <button
                  onClick={closeUnitDetail}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Unit Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Unit Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Unit Number</label>
                      <p className="text-sm text-gray-900">{selectedUnit.unit_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Floor</label>
                      <p className="text-sm text-gray-900">{selectedUnit.floor || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Type</label>
                      <p className="text-sm text-gray-900">{selectedUnit.type || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <p className="text-sm text-gray-900">
                        {selectedUnit.created_at ? new Date(selectedUnit.created_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Leaseholder Information */}
                {selectedUnit.leaseholders && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Leaseholder Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <span className="text-lg font-medium text-gray-900">
                          {selectedUnit.leaseholders.name || 'Unnamed Leaseholder'}
                        </span>
                        {getDirectorBadge(selectedUnit.leaseholders)}
                      </div>
                      
                      <div className="space-y-2">
                        {selectedUnit.leaseholders.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900">{selectedUnit.leaseholders.email}</span>
                          </div>
                        )}
                        
                        {selectedUnit.leaseholders.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900">{selectedUnit.leaseholders.phone}</span>
                          </div>
                        )}

                        {selectedUnit.leaseholders.is_director && selectedUnit.leaseholders.director_since && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900">
                              Director since {new Date(selectedUnit.leaseholders.director_since).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {selectedUnit.leaseholders.director_notes && (
                          <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                            <p className="text-sm text-purple-800">{selectedUnit.leaseholders.director_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors">
                    <FileText className="h-4 w-4 mr-2 inline" />
                    View Documents
                  </button>
                  <button className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors">
                    <Mail className="h-4 w-4 mr-2 inline" />
                    Send Communication
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}