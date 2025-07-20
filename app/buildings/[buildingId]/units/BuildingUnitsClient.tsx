'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building, Users, Mail, Phone, UserPlus, Calendar, PoundSterling, Home, User } from 'lucide-react'
import Link from 'next/link'
import { Tables } from '@/lib/database.types'

type Unit = Tables<'units'> & {
  leaseholders?: Array<{
    id: string
    name: string | null
    email: string | null
    phone: string | null
  }>
  occupiers?: Array<{
    id: string
    full_name: string
    email: string | null
    phone: string | null
    start_date: string | null
    end_date: string | null
    rent_amount: number | null
    rent_frequency: string | null
    status: string | null
  }>
}

interface BuildingUnitsClientProps {
  building: Tables<'buildings'>
  units: Unit[]
}

export default function BuildingUnitsClient({ building, units }: BuildingUnitsClientProps) {
  console.log('BuildingUnitsClient - Received building:', building)
  console.log('BuildingUnitsClient - Received units:', units)
  console.log('BuildingUnitsClient - Units count:', units?.length || 0)

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

  const handleCallLeaseholder = (phone: string) => {
    window.open(`tel:${phone}`, '_blank')
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB')
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

          const hasLeaseholder = (unit.leaseholders?.length ?? 0) > 0
          const hasOccupier = (unit.occupiers?.length ?? 0) > 0
          const primaryLeaseholder = hasLeaseholder ? unit.leaseholders![0] : null
          const primaryOccupier = hasOccupier ? unit.occupiers![0] : null

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
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {unit.type || 'Residential'}
                      </Badge>
                      {hasLeaseholder && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          <User className="h-3 w-3 mr-1" />
                          Has Leaseholder
                        </Badge>
                      )}
                      {hasOccupier && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                          <Home className="h-3 w-3 mr-1" />
                          Occupied
                        </Badge>
                      )}
                    </div>
                  </div>
                  {unit.floor && (
                    <p className="text-sm text-gray-500">Floor {unit.floor}</p>
                  )}
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Leaseholder Information */}
                  {hasLeaseholder && primaryLeaseholder ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-700">
                            Leaseholder
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900">
                            {primaryLeaseholder.name || 'Unknown Name'}
                          </p>
                          
                          {primaryLeaseholder.email && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-600 truncate">
                                {primaryLeaseholder.email}
                              </span>
                            </div>
                          )}
                          
                          {primaryLeaseholder.phone && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-600">
                                {primaryLeaseholder.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-500 italic">
                        No leaseholder assigned
                      </div>
                    </div>
                  )}

                  {/* Occupier Information */}
                  {hasOccupier && primaryOccupier && (
                    <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Home className="h-4 w-4 text-blue-400" />
                          <span className="font-medium text-gray-700">
                            Current Occupier
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900">
                            {primaryOccupier.full_name}
                          </p>
                          
                          {primaryOccupier.email && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-600 truncate">
                                {primaryOccupier.email}
                              </span>
                            </div>
                          )}
                          
                          {primaryOccupier.phone && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-600">
                                {primaryOccupier.phone}
                              </span>
                            </div>
                          )}

                          {/* Rent Information */}
                          {primaryOccupier.rent_amount && (
                            <div className="flex items-center space-x-2 text-sm">
                              <PoundSterling className="h-3 w-3 text-green-400" />
                              <span className="text-gray-600">
                                {formatCurrency(primaryOccupier.rent_amount)} {primaryOccupier.rent_frequency}
                              </span>
                            </div>
                          )}

                          {/* Tenancy Period */}
                          {primaryOccupier.start_date && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-600">
                                Since {formatDate(primaryOccupier.start_date)}
                              </span>
                            </div>
                          )}

                          {/* Status */}
                          {primaryOccupier.status && (
                            <Badge 
                              variant={primaryOccupier.status === 'Active' ? 'default' : 'outline'}
                              className="text-xs mt-1"
                            >
                              {primaryOccupier.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100 mt-4">
                    {primaryLeaseholder?.email && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleEmailLeaseholder(primaryLeaseholder.email!)
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                        title="Email leaseholder"
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </button>
                    )}
                    
                    {primaryLeaseholder?.phone && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleCallLeaseholder(primaryLeaseholder.phone!)
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors"
                        title="Call leaseholder"
                      >
                        <Phone className="h-3 w-3" />
                        Call
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100 transition-colors"
                      title="Add occupier"
                    >
                      <UserPlus className="h-3 w-3" />
                      Add Occupier
                    </button>
                  </div>
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
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">
                Total Units: {units.length}
              </p>
              <p className="text-sm text-gray-500">
                {building.unit_count ? `Expected: ${building.unit_count}` : ''}
              </p>
              <p className="text-sm text-gray-500">
                Units with leaseholders: {units.filter(u => u.leaseholders && u.leaseholders.length > 0).length}
              </p>
              <p className="text-sm text-gray-500">
                Occupied units: {units.filter(u => u.occupiers && u.occupiers.length > 0).length}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-sm">
                {units.length} Total Units
              </Badge>
              <Badge className="bg-green-100 text-green-700 border-green-200 text-sm">
                {units.filter(u => u.leaseholders && u.leaseholders.length > 0).length} With Leaseholders
              </Badge>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm">
                {units.filter(u => u.occupiers && u.occupiers.length > 0).length} Occupied
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 