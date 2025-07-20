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
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Filter,
  Grid,
  List
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
  units?: any[]
  leases?: any[]
}

interface BuildingsClientProps {
  buildings: Building[]
}

export default function BuildingsClient({ buildings }: BuildingsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'units' | 'date'>('name')

  // Filter buildings based on search term
  const filteredBuildings = buildings.filter(building => {
    const searchLower = searchTerm.toLowerCase()
    return (
      building.name.toLowerCase().includes(searchLower) ||
      (building.address && building.address.toLowerCase().includes(searchLower))
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

  // Calculate building stats
  const totalUnits = buildings.reduce((sum, building) => sum + (building.unit_count || 0), 0)
  const occupiedUnits = buildings.reduce((sum, building) => {
    return sum + (building.leases?.length || 0)
  }, 0)
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  if (buildings.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="relative mb-8">
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-full w-32 h-32 flex items-center justify-center mx-auto">
              <Building2 className="h-16 w-16 text-teal-600" />
            </div>
            <div className="absolute -top-2 -right-2 bg-orange-500 rounded-full p-2">
              <Wrench className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">No buildings yet</h3>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Get started by adding your first building to begin managing your property portfolio with our comprehensive tools.
          </p>
          <Button size="lg" className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <Plus className="h-6 w-6 mr-2" />
            Add First Building
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-700">Total Buildings</p>
                <p className="text-3xl font-bold text-teal-900">{buildings.length}</p>
              </div>
              <div className="bg-teal-500 rounded-full p-3">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Units</p>
                <p className="text-3xl font-bold text-blue-900">{totalUnits}</p>
              </div>
              <div className="bg-blue-500 rounded-full p-3">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Occupancy Rate</p>
                <p className="text-3xl font-bold text-green-900">{occupancyRate}%</p>
              </div>
              <div className="bg-green-500 rounded-full p-3">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Active Leases</p>
                <p className="text-3xl font-bold text-purple-900">{occupiedUnits}</p>
              </div>
              <div className="bg-purple-500 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search buildings by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-sm text-lg transition-all duration-200"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sm font-medium"
            >
              <option value="name">Sort by Name</option>
              <option value="units">Sort by Units</option>
              <option value="date">Sort by Date</option>
            </select>

            {/* View Mode Toggle */}
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

        {/* Search Results Info */}
        {searchTerm && (
          <div className="mt-4 text-center">
            <Badge variant="outline" className="px-4 py-2 text-sm">
              {filteredBuildings.length === 0 ? (
                <span>No buildings found matching "{searchTerm}"</span>
              ) : (
                <span>Showing {filteredBuildings.length} of {buildings.length} buildings</span>
              )}
            </Badge>
          </div>
        )}
      </div>

      {/* Buildings Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedBuildings.map((building) => (
            <BuildingCard key={building.id} building={building} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBuildings.map((building) => (
            <BuildingListItem key={building.id} building={building} />
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
              Expand your property portfolio and manage more buildings efficiently with our comprehensive tools.
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

// Building Card Component
function BuildingCard({ building }: { building: Building }) {
  const occupancyRate = building.unit_count && building.leases 
    ? Math.round((building.leases.length / building.unit_count) * 100) 
    : 0

  return (
    <Link href={`/buildings/${building.id}`} className="group block">
      <Card className="h-full bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden transform hover:scale-105 group-hover:border-teal-200">
        {/* Header with Gradient */}
        <div className="relative">
          <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-blue-600 p-6 text-white">
            {/* Coming Soon Badge */}
            {building.demo_ready === false && (
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                  🚧 Coming Soon
                </Badge>
              </div>
            )}
            
            <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 mx-auto backdrop-blur-sm">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-center group-hover:text-teal-100 transition-colors duration-200">
              {building.name}
            </h3>
          </div>
        </div>
        
        {/* Content */}
        <CardContent className="p-6">
          {/* Address */}
          {building.address && (
            <div className="flex items-start space-x-3 mb-4">
              <MapPin className="h-5 w-5 text-teal-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 leading-relaxed">
                {building.address}
              </p>
            </div>
          )}
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-teal-500 mr-1" />
                <span className="text-lg font-bold text-gray-900">{building.unit_count || 0}</span>
              </div>
              <p className="text-xs text-gray-500">Units</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-lg font-bold text-gray-900">{occupancyRate}%</span>
              </div>
              <p className="text-xs text-gray-500">Occupied</p>
            </div>
          </div>
          
          {/* Sample Units */}
          {building.units && building.units.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Units</h4>
              <div className="space-y-2">
                {building.units.slice(0, 3).map((unit) => (
                  <div key={unit.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">{unit.unit_number}</span>
                    {building.leases && building.leases.find(lease => lease.unit === unit.id) ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">Occupied</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">Vacant</Badge>
                    )}
                  </div>
                ))}
                {building.units.length > 3 && (
                  <div className="text-xs text-gray-400 italic text-center pt-2">
                    +{building.units.length - 3} more units
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl transition-all duration-200 transform group-hover:scale-105 shadow-md">
              <span className="text-sm font-semibold">View Details</span>
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
            
            <Link
              href={`/compliance/${building.id}`}
              className="block"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" className="w-full border-teal-200 text-teal-700 hover:bg-teal-50 rounded-xl transition-all duration-200">
                <Shield className="h-4 w-4 mr-2" />
                <span className="text-sm font-semibold">Compliance</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Building List Item Component
function BuildingListItem({ building }: { building: Building }) {
  const occupancyRate = building.unit_count && building.leases 
    ? Math.round((building.leases.length / building.unit_count) * 100) 
    : 0

  return (
    <Link href={`/buildings/${building.id}`} className="group block">
      <Card className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-teal-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {/* Left side - Building info */}
            <div className="flex items-center space-x-6 flex-1">
              {/* Building Icon */}
              <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl p-4">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              
              {/* Building Details */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-teal-700 transition-colors duration-200">
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
                    <p className="text-gray-600">{building.address}</p>
                  </div>
                )}
                
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{building.unit_count || 0} units</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>{occupancyRate}% occupied</span>
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
              <Link
                href={`/compliance/${building.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="sm" className="border-teal-200 text-teal-700 hover:bg-teal-50">
                  <Shield className="h-4 w-4 mr-1" />
                  Compliance
                </Button>
              </Link>
              
              <Button size="sm" className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white">
                <span>View</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
} 