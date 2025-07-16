'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building, Users, Mail, Phone, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Tables } from '@/lib/database.types'

type Unit = Tables<'units'> & {
  leaseholders: Tables<'leaseholders'>[]
}

interface BuildingUnitsClientProps {
  building: Tables<'buildings'>
  units: Unit[]
}

export default function BuildingUnitsClient({ building, units }: BuildingUnitsClientProps) {
  // Safety checks
  if (!building) {
    console.error('BuildingUnitsClient - No building data provided')
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Building Not Found</h3>
        <p className="text-gray-500">The building data could not be loaded.</p>
      </div>
    )
  }

  if (!units || !Array.isArray(units)) {
    console.error('BuildingUnitsClient - Invalid units data:', units)
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Units Data Error</h3>
        <p className="text-gray-500">The units data could not be loaded.</p>
      </div>
    )
  }

  const handleEmailLeaseholder = (email: string) => {
    window.open(`mailto:${email}`, '_blank')
  }
  
  return (
    <div className="space-y-6">
      {/* Building Header */}
      <div className="flex items-center space-x-3 mb-8">
        <Building className="h-8 w-8 text-teal-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{building.name || 'Unknown Building'}</h1>
          <p className="text-gray-600">{building.address || 'No address available'}</p>
        </div>
      </div>

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {units.map((unit) => {
          // Safety check for unit data
          if (!unit || !unit.id) {
            console.error('BuildingUnitsClient - Invalid unit data:', unit)
            return null
          }

          return (
            <Link 
              key={unit.id} 
              href={`/buildings/${building.id}/units/${unit.id}`}
              className="block transition-transform hover:scale-105"
            >
              <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-teal-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      Unit {unit.unit_number || 'Unknown'}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {unit.type || 'Residential'}
                    </Badge>
                  </div>
                  {unit.floor && (
                    <p className="text-sm text-gray-500">Floor {unit.floor}</p>
                  )}
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Leaseholder Information */}
                  {unit.leaseholders && Array.isArray(unit.leaseholders) && unit.leaseholders.length > 0 ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-700">
                            {unit.leaseholders[0]?.name || 'Unknown'}
                          </span>
                        </div>
                        
                        {unit.leaseholders[0]?.email && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 truncate">
                              {unit.leaseholders[0].email}
                            </span>
                          </div>
                        )}
                        
                        {unit.leaseholders[0]?.phone && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              {unit.leaseholders[0].phone}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        {unit.leaseholders[0]?.email && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleEmailLeaseholder(unit.leaseholders[0].email)
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                            title="Email leaseholder"
                          >
                            <Mail className="h-3 w-3" />
                            Email
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors"
                          title="Add occupier"
                        >
                          <UserPlus className="h-3 w-3" />
                          Add Occupier
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-500 italic">
                        No leaseholder assigned
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors"
                          title="Add occupier"
                        >
                          <UserPlus className="h-3 w-3" />
                          Add Occupier
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Empty State */}
      {units.length === 0 && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Units Found</h3>
          <p className="text-gray-500">
            No units have been added to this building yet.
          </p>
        </div>
      )}

      {/* Summary */}
      {units.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Total Units: {units.length}
              </p>
              <p className="text-sm text-gray-500">
                {building.unit_count ? `Expected: ${building.unit_count}` : ''}
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {units.filter(u => u.leaseholders && Array.isArray(u.leaseholders) && u.leaseholders.length > 0).length} Occupied
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
} 