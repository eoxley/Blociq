'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Building2, 
  MapPin, 
  Users, 
  ArrowRight, 
  Search, 
  Shield, 
  Plus, 
  Wrench, 
  Calendar,
  CheckCircle,
  Grid,
  List,
  Filter,
  User,
  Mail,
  Phone,
  Eye,
  Home
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// Define the Building type based on the database schema
type Building = {
  id: number
  name: string
  address: string | null
  unit_count: number | null
  created_at: string | null
  demo_ready?: boolean
  units?: {
    id: number
    unit_number: string
    building_id: number
    leaseholders?: {
      id: number
      name: string
      email: string
      phone: string
    }[]
  }[]
}

interface BuildingsClientProps {
  buildings: Building[]
}

export default function BuildingsClient({ buildings }: BuildingsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'units' | 'date'>('name')
  const [showUnitDetails, setShowUnitDetails] = useState<number | null>(null)

  // Filter buildings based on search term
  const filteredBuildings = buildings.filter(building => {
    const searchLower = searchTerm.toLowerCase()
    return (
      building.name.toLowerCase().includes(searchLower) ||
      (building.address && building.address.toLowerCase().includes(searchLower)) ||
      (building.units && building.units.some(unit => 
        unit.unit_number.toLowerCase().includes(searchLower) ||
        (unit.leaseholders && unit.leaseholders.some(leaseholder => 
          leaseholder.name.toLowerCase().includes(searchLower) ||
          leaseholder.email.toLowerCase().includes(searchLower)
        ))
      ))
    )
  })

  // Sort buildings
  const sortedBuildings = [...filteredBuildings].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'units':
        return (b.unit_count || 0) - (a.unit_count || 0)
      case 'date':
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      default:
        return 0
    }
  })



  if (buildings.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="relative mb-8">
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-full w-32 h-32 flex items-center justify-center mx-auto">
              <Building2 className="h-16 w-16 text-teal-600" />
            </div>
            <div className="absolute -top-2 -right-2 bg-orange-500 rounded-full p-2">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Buildings Found</h2>
          <p className="text-gray-600 mb-8">Get started by adding your first building to your property portfolio.</p>
          <div className="space-y-4">
            <Button className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-lg rounded-xl px-8 py-3">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Building
            </Button>
            <div className="text-sm text-gray-500">
              <p>Need help? Check out our <Link href="/help" className="text-teal-600 hover:text-teal-700 underline">setup guide</Link></p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">Property Portfolio</h1>
              <p className="text-teal-100 text-lg">Manage all your buildings and leaseholders in one place</p>
            </div>
            <div className="flex items-center gap-4">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Building
              </Button>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Users className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-teal-50 to-teal-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-teal-700 group-hover:scale-110 transition-transform duration-300">
                  {buildings.length}
                </div>
                <div className="text-sm text-teal-600 font-medium">Total Buildings</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-700 group-hover:scale-110 transition-transform duration-300">
                  {buildings.reduce((total, building) => total + (building.unit_count || 0), 0)}
                </div>
                <div className="text-sm text-blue-600 font-medium">Total Units</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Home className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-700 group-hover:scale-110 transition-transform duration-300">
                  {buildings.filter(b => b.units && b.units.length > 0).length}
                </div>
                <div className="text-sm text-green-600 font-medium">With Units</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-purple-700 group-hover:scale-110 transition-transform duration-300">
                  {buildings.filter(b => b.demo_ready).length}
                </div>
                <div className="text-sm text-purple-600 font-medium">Ready</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sm font-medium shadow-sm"
            >
              <option value="name">Sort by Name</option>
              <option value="units">Sort by Units</option>
              <option value="date">Sort by Date</option>
            </select>

            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-white text-teal-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-white text-teal-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search buildings, units, or leaseholders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-sm text-lg transition-all duration-200"
        />
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="text-center">
          <Badge variant="outline" className="px-4 py-2 text-sm">
            {filteredBuildings.length === 0 ? (
              <span>No buildings found matching "{searchTerm}"</span>
            ) : (
              <span>Showing {filteredBuildings.length} of {buildings.length} buildings</span>
            )}
          </Badge>
        </div>
      )}

      {/* Buildings Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBuildings.map((building) => (
            <BuildingCard 
              key={building.id} 
              building={building} 
              showUnitDetails={showUnitDetails === building.id}
              onToggleUnitDetails={() => setShowUnitDetails(showUnitDetails === building.id ? null : building.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBuildings.map((building) => (
            <BuildingListItem 
              key={building.id} 
              building={building}
              showUnitDetails={showUnitDetails === building.id}
              onToggleUnitDetails={() => setShowUnitDetails(showUnitDetails === building.id ? null : building.id)}
            />
          ))}
        </div>
      )}

      {/* No Results Message */}
      {searchTerm && filteredBuildings.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Search className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No matching buildings</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Try adjusting your search terms or browse all buildings to find what you're looking for.
          </p>
          <Button
            onClick={() => setSearchTerm('')}
            variant="outline"
            size="lg"
            className="bg-white hover:bg-gray-50"
          >
            Clear Search
          </Button>
        </div>
      )}

      {/* Add Building CTA */}
      {!searchTerm && (
        <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
          <CardContent className="p-8 text-center">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <div className="relative">
                <Plus className="h-8 w-8 text-white" />
                <Wrench className="h-4 w-4 text-white absolute -top-1 -right-1 bg-orange-500 rounded-full p-0.5" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Add Another Building</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Expand your property portfolio and manage more buildings efficiently.
            </p>
            <Button size="lg" className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Plus className="h-5 w-5 mr-2" />
              Add Building
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Enhanced Building Card Component
function BuildingCard({ 
  building, 
  showUnitDetails, 
  onToggleUnitDetails 
}: { 
  building: Building
  showUnitDetails: boolean
  onToggleUnitDetails: () => void
}) {

  return (
    <div className="group">
      <Card className="h-full bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden transform hover:scale-105 group-hover:border-teal-200">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-4 text-white relative">
          {building.demo_ready === false && (
            <Badge className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-600 text-white border-0">
              🚧 Coming Soon
            </Badge>
          )}
          
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold group-hover:text-teal-100 transition-colors duration-200">
                {building.name}
              </h3>
              {building.address && (
                <p className="text-sm text-teal-100 opacity-90 truncate">
                  {building.address}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Enhanced Content */}
        <CardContent className="p-4">
          {/* Enhanced Stats */}
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 mb-4">
            <div className="flex items-center justify-center mb-1">
              <Home className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-xl font-bold text-blue-900">{building.unit_count || 0}</span>
            </div>
            <p className="text-xs text-blue-700 font-medium">Total Units</p>
          </div>
          
          {/* Unit Details Toggle */}
          {building.units && building.units.length > 0 && (
            <div className="mb-4">
              <button
                onClick={onToggleUnitDetails}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {showUnitDetails ? 'Hide' : 'Show'} Unit Details
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {building.units.length} units
                </Badge>
              </button>
              
              {/* Expanded Unit Details */}
              {showUnitDetails && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {building.units.map((unit) => (
                    <div key={unit.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">{unit.unit_number}</span>
                        {unit.leaseholders && unit.leaseholders.length > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                            <User className="h-3 w-3 mr-1" />
                            Has Leaseholder
                          </Badge>
                        )}
                      </div>
                      
                      {unit.leaseholders && unit.leaseholders.length > 0 && (
                        <div className="space-y-1">
                          {unit.leaseholders.map((leaseholder) => (
                            <div key={leaseholder.id} className="text-xs text-gray-600 space-y-1">
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span className="font-medium">{leaseholder.name || 'Unknown'}</span>
                              </div>
                              {leaseholder.email && (
                                <div className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{leaseholder.email}</span>
                                </div>
                              )}
                              {leaseholder.phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{leaseholder.phone}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Enhanced Action Buttons */}
          <div className="space-y-2">
            <Link href={`/buildings/${building.id}`} className="block">
              <Button className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-lg transition-all duration-200 transform group-hover:scale-105 shadow-sm">
                <span className="text-sm font-semibold">View Details</span>
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </Link>
            
            <div className="flex gap-2">
              <Link
                href={`/compliance/${building.id}`}
                className="block flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" className="w-full border-teal-200 text-teal-700 hover:bg-teal-50 rounded-lg transition-all duration-200">
                  <Shield className="h-4 w-4 mr-1" />
                  <span className="text-xs font-semibold">Compliance</span>
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Enhanced Building List Item Component
function BuildingListItem({ 
  building, 
  showUnitDetails, 
  onToggleUnitDetails 
}: { 
  building: Building
  showUnitDetails: boolean
  onToggleUnitDetails: () => void
}) {

  return (
    <div className="group">
      <Card className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Left side - Building info */}
            <div className="flex items-center space-x-4 flex-1">
              {/* Building Icon */}
              <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg p-3">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              
              {/* Building Details */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-700 transition-colors duration-200">
                    {building.name}
                  </h3>
                  {building.demo_ready === false && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                      🚧 Coming Soon
                    </Badge>
                  )}
                </div>
                
                {building.address && (
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-600 text-sm">{building.address}</p>
                  </div>
                )}
                
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Home className="h-4 w-4" />
                    <span>{building.unit_count || 0} units</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Added {building.created_at ? new Date(building.created_at).toLocaleDateString() : 'Recently'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={onToggleUnitDetails}
                className="p-2 text-gray-500 hover:text-teal-600 transition-colors duration-200"
                title={showUnitDetails ? 'Hide unit details' : 'Show unit details'}
              >
                <Eye className="h-4 w-4" />
              </button>
              
              <Link
                href={`/compliance/${building.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="sm" className="border-teal-200 text-teal-700 hover:bg-teal-50">
                  <Shield className="h-4 w-4 mr-1" />
                  Compliance
                </Button>
              </Link>
              
              <Link href={`/buildings/${building.id}`}>
                <Button size="sm" className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white">
                  <span>View</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Expanded Unit Details for List View */}
          {showUnitDetails && building.units && building.units.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {building.units.map((unit) => (
                  <div key={unit.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{unit.unit_number}</span>
                      {unit.leaseholders && unit.leaseholders.length > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                          <User className="h-3 w-3 mr-1" />
                          Has Leaseholder
                        </Badge>
                      )}
                    </div>
                    
                    {unit.leaseholders && unit.leaseholders.length > 0 && (
                      <div className="space-y-1">
                        {unit.leaseholders.map((leaseholder) => (
                          <div key={leaseholder.id} className="text-xs text-gray-600">
                            <div className="font-medium">{leaseholder.name || 'Unknown'}</div>
                            {leaseholder.email && (
                              <div className="truncate">{leaseholder.email}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 