'use client'

import { useState } from 'react'
import { Home, User, Mail, Phone, Search, AlertTriangle, FileText, Calendar } from 'lucide-react'

interface Unit {
  id: number
  unit_number: string
  type: string | null
  floor: string | null
  building_id: number
  leaseholder_id: string | null
  created_at: string | null
}

interface Leaseholder {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

interface UnitListProps {
  units: Unit[]
  leaseholders: Leaseholder[]
  buildingId: string
}

export default function UnitList({ units, leaseholders, buildingId }: UnitListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)

  // Create a map of leaseholders by ID for quick lookup
  const leaseholderMap = new Map(leaseholders.map(l => [l.id, l]))

  // Filter units based on search term
  const filteredUnits = units.filter(unit => {
    const searchLower = searchTerm.toLowerCase()
    const unitNumber = unit.unit_number.toLowerCase()
    const leaseholder = unit.leaseholder_id ? leaseholderMap.get(unit.leaseholder_id) : null
    const leaseholderName = leaseholder?.name?.toLowerCase() || ''
    const leaseholderEmail = leaseholder?.email?.toLowerCase() || ''

    return unitNumber.includes(searchLower) || 
           leaseholderName.includes(searchLower) || 
           leaseholderEmail.includes(searchLower)
  })

  const getLeaseholder = (unit: Unit) => {
    return unit.leaseholder_id ? leaseholderMap.get(unit.leaseholder_id) : null
  }

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="mb-6">
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
      </div>

      {/* Units List */}
      {filteredUnits.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No units found' : 'No units yet'}
          </h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms.' : 'No units have been added to this building yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {filteredUnits.map((unit) => {
            const leaseholder = getLeaseholder(unit)
            
            return (
              <div 
                key={unit.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
                onClick={() => setSelectedUnit(unit)}
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
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {unit.type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Leaseholder Information */}
                    {leaseholder ? (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-green-600" />
                          <h4 className="font-medium text-gray-900">
                            {leaseholder.name || 'Unnamed Leaseholder'}
                          </h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {leaseholder.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <a 
                                href={`mailto:${leaseholder.email}`}
                                className="text-blue-600 hover:underline truncate"
                              >
                                {leaseholder.email}
                              </a>
                            </div>
                          )}
                          
                          {leaseholder.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <a 
                                href={`tel:${leaseholder.phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {leaseholder.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-800 font-medium">
                            No leaseholder assigned
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="ml-4">
                    <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Unit Detail Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ease-in-out">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Unit {selectedUnit.unit_number} Details
                </h2>
                <button 
                  onClick={() => setSelectedUnit(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Unit Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Unit Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Unit Number</p>
                      <p className="text-gray-900">{selectedUnit.unit_number}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Type</p>
                      <p className="text-gray-900">{selectedUnit.type || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Floor</p>
                      <p className="text-gray-900">{selectedUnit.floor || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Created</p>
                      <p className="text-gray-900">
                        {selectedUnit.created_at ? new Date(selectedUnit.created_at).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Leaseholder Information */}
                {getLeaseholder(selectedUnit) && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Leaseholder Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Name</p>
                          <p className="text-gray-900">{getLeaseholder(selectedUnit)?.name || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Email</p>
                          <p className="text-gray-900">
                            {getLeaseholder(selectedUnit)?.email ? (
                              <a href={`mailto:${getLeaseholder(selectedUnit)?.email}`} className="text-blue-600 hover:underline">
                                {getLeaseholder(selectedUnit)?.email}
                              </a>
                            ) : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Phone</p>
                          <p className="text-gray-900">
                            {getLeaseholder(selectedUnit)?.phone ? (
                              <a href={`tel:${getLeaseholder(selectedUnit)?.phone}`} className="text-blue-600 hover:underline">
                                {getLeaseholder(selectedUnit)?.phone}
                              </a>
                            ) : 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">View Documents</span>
                    </button>
                    <button className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">View History</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedUnit(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                  Edit Unit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 