'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building, Users, Mail, Phone, UserPlus, Calendar, PoundSterling, Home, User, AlertTriangle } from 'lucide-react'
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
  units: any[] // Changed to any to handle database types mismatch
  buildingId: string
}

export default function BuildingUnitsClient({ building, units, buildingId }: BuildingUnitsClientProps) {
  console.log('BuildingUnitsClient - Received building:', building)
  console.log('BuildingUnitsClient - Received units:', units)
  console.log('BuildingUnitsClient - Units count:', units?.length || 0)
  console.log('BuildingUnitsClient - Building ID:', buildingId)

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

      {/* Units List */}
      {units.length > 0 ? (
        <div className="space-y-4">
          {units.map((unit) => {
            // Safety check for unit data
            if (!unit || !unit.id) {
              console.error('BuildingUnitsClient - Invalid unit data:', unit)
              return null
            }

            return (
              <Card key={unit.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <Home className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          Unit {unit.unit_number || 'Unknown'}
                        </h3>
                        {unit.floor && (
                          <p className="text-sm text-gray-600">Floor {unit.floor}</p>
                        )}
                        {unit.type && (
                          <p className="text-sm text-gray-600">{unit.type}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-sm">
                        {unit.type || 'Residential'}
                      </Badge>
                      <Link
                        href={`/units/${unit.id}/leaseholder`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors duration-200"
                      >
                        <User className="h-4 w-4" />
                        View Leaseholder Info
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-gray-900 mb-4">No Units Found</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            No units have been found for this building. This could be due to:
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-left">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Possible Issues:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• No units exist for this building in the database</li>
                  <li>• RLS (Row Level Security) policies on the units table may be blocking access</li>
                  <li>• Database schema mismatch between building_id types (UUID vs integer)</li>
                  <li>• User permissions may not allow viewing units for this building</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 mb-4">
            <p>Building ID: {buildingId}</p>
            <p>Check the browser console for detailed debugging information.</p>
          </div>
          
          {/* Debug Link */}
          <div className="mt-4">
            <a 
              href={`/api/test-units?buildingId=${buildingId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
            >
              🔍 Debug: Test Units API
            </a>
          </div>
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
                Building ID: {buildingId}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-sm">
                {units.length} Total Units
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 