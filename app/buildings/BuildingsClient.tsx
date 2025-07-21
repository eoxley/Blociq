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
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'

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
            <div className="bg-gradient-to-br from-[#F0FDFA] to-[#E2E8F0] rounded-full w-32 h-32 flex items-center justify-center mx-auto">
              <Building2 className="h-16 w-16 text-[#2BBEB4]" />
            </div>
            <div className="absolute -top-2 -right-2 bg-[#2BBEB4] rounded-full p-2">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#333333] mb-4">No Buildings Found</h2>
          <p className="text-[#64748B] mb-8">Get started by adding your first building to your property portfolio.</p>
          <div className="space-y-4">
            <BlocIQButton className="px-8 py-3">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Building
            </BlocIQButton>
            <div className="text-sm text-[#64748B]">
              <p>Need help? Check out our <Link href="/help" className="text-[#2BBEB4] hover:text-[#0F5D5D] underline">setup guide</Link></p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with BlocIQ Branding */}
      <div className="bg-gradient-to-r from-[#2BBEB4] to-[#0F5D5D] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Property Portfolio</h1>
            <p className="text-xl text-white/90">Manage all your buildings and leaseholders in one place</p>
          </div>
          <div className="flex items-center gap-4">
            <BlocIQButton 
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Building
            </BlocIQButton>
            <BlocIQButton 
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Users className="h-4 w-4 mr-2" />
              Import Data
            </BlocIQButton>
          </div>
        </div>
      </div>

      {/* Enhanced Controls */}
      <BlocIQCard variant="elevated" className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2BBEB4] focus:border-transparent bg-white text-sm font-medium shadow-sm"
            >
              <option value="name">Sort by Name</option>
              <option value="units">Sort by Units</option>
              <option value="date">Sort by Date</option>
            </select>

            <div className="flex bg-[#F3F4F6] rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-white text-[#2BBEB4] shadow-sm' 
                    : 'text-[#64748B] hover:text-[#333333]'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-white text-[#2BBEB4] shadow-sm' 
                    : 'text-[#64748B] hover:text-[#333333]'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </BlocIQCard>

      {/* Enhanced Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-[#64748B]" />
        </div>
        <input
          type="text"
          placeholder="Search buildings, units, or leaseholders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-12 pr-4 py-4 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2BBEB4] focus:border-transparent bg-white shadow-sm text-lg transition-all duration-200"
        />
      </div>

      {/* Buildings Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBuildings.map((building) => (
            <BuildingCard
              key={building.id}
              building={building}
              showUnitDetails={showUnitDetails === building.id}
              onToggleUnitDetails={() => setShowUnitDetails(
                showUnitDetails === building.id ? null : building.id
              )}
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
              onToggleUnitDetails={() => setShowUnitDetails(
                showUnitDetails === building.id ? null : building.id
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

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
    <BlocIQCard variant="elevated" className="hover:shadow-lg transition-all duration-300 hover:scale-105">
      <BlocIQCardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">{building.name}</h3>
              {building.address && (
                <div className="flex items-center gap-1 text-sm text-[#64748B] mt-1">
                  <MapPin className="h-3 w-3" />
                  {building.address}
                </div>
              )}
            </div>
          </div>
          <BlocIQBadge variant="primary" size="sm">
            {building.unit_count || 0} Units
          </BlocIQBadge>
        </div>
      </BlocIQCardHeader>
      
      <BlocIQCardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-[#64748B]">
              <Users className="h-4 w-4" />
              <span>{building.unit_count || 0} Units</span>
            </div>
            <div className="flex items-center gap-2 text-[#64748B]">
              <Calendar className="h-4 w-4" />
              <span>{building.created_at ? new Date(building.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
            <BlocIQButton
              onClick={onToggleUnitDetails}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {showUnitDetails ? 'Hide' : 'View'} Units
            </BlocIQButton>
            
            <Link href={`/buildings/${building.id}`}>
              <BlocIQButton size="sm" className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Details
              </BlocIQButton>
            </Link>
          </div>
          
          {showUnitDetails && building.units && building.units.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <h4 className="font-medium text-[#333333] mb-3">Units</h4>
              <div className="space-y-2">
                {building.units.slice(0, 3).map((unit) => (
                  <div key={unit.id} className="flex items-center justify-between p-2 bg-[#FAFAFA] rounded-lg">
                    <span className="text-sm font-medium text-[#333333]">{unit.unit_number}</span>
                    {unit.leaseholders && unit.leaseholders.length > 0 && (
                      <BlocIQBadge variant="secondary" size="sm">
                        Occupied
                      </BlocIQBadge>
                    )}
                  </div>
                ))}
                {building.units.length > 3 && (
                  <div className="text-sm text-[#64748B] text-center">
                    +{building.units.length - 3} more units
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </BlocIQCardContent>
    </BlocIQCard>
  )
}

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
    <BlocIQCard variant="elevated" className="hover:shadow-lg transition-all duration-300">
      <BlocIQCardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#333333]">{building.name}</h3>
              {building.address && (
                <div className="flex items-center gap-1 text-sm text-[#64748B] mt-1">
                  <MapPin className="h-3 w-3" />
                  {building.address}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-[#64748B]">Units</div>
              <div className="text-lg font-semibold text-[#333333]">{building.unit_count || 0}</div>
            </div>
            
            <div className="flex items-center gap-2">
              <BlocIQButton
                onClick={onToggleUnitDetails}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {showUnitDetails ? 'Hide' : 'View'} Units
              </BlocIQButton>
              
              <Link href={`/buildings/${building.id}`}>
                <BlocIQButton size="sm" className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Details
                </BlocIQButton>
              </Link>
            </div>
          </div>
        </div>
        
        {showUnitDetails && building.units && building.units.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
            <h4 className="font-medium text-[#333333] mb-4">Units</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {building.units.map((unit) => (
                <div key={unit.id} className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-xl">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-[#64748B]" />
                    <span className="text-sm font-medium text-[#333333]">{unit.unit_number}</span>
                  </div>
                  {unit.leaseholders && unit.leaseholders.length > 0 && (
                    <BlocIQBadge variant="secondary" size="sm">
                      Occupied
                    </BlocIQBadge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </BlocIQCardContent>
    </BlocIQCard>
  )
} 