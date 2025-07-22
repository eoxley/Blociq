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
  Home,
  Clock
} from 'lucide-react'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { Input } from '@/components/ui/input'

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
              <Building2 className="h-16 w-16 text-[#008C8F]" />
            </div>
            <div className="absolute -top-2 -right-2 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-full p-2">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#333333] mb-4">No Buildings Yet</h2>
          <p className="text-[#64748B] mb-8">Get started by adding your first building to the portfolio</p>
          <BlocIQButton className="bg-gradient-to-r from-[#008C8F] to-[#007BDB] text-white shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            Add First Building
          </BlocIQButton>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Buildings Portfolio</h1>
            <p className="text-white/80">Manage your property portfolio and leaseholder information</p>
          </div>
          <div className="flex items-center gap-4">
            <BlocIQButton className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Building
            </BlocIQButton>
          </div>
        </div>
      </div>



      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] h-4 w-4" />
            <Input
              type="text"
              placeholder="Search buildings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80 border-[#E2E8F0] focus:border-[#008C8F] focus:ring-[#008C8F] rounded-xl"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'units' | 'date')}
            className="border border-[#E2E8F0] rounded-xl px-4 py-2 text-sm focus:border-[#008C8F] focus:ring-[#008C8F] outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="units">Sort by Units</option>
            <option value="date">Sort by Date</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <BlocIQButton
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="flex items-center gap-2"
          >
            <Grid className="h-4 w-4" />
            Grid
          </BlocIQButton>
          <BlocIQButton
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            List
          </BlocIQButton>
        </div>
      </div>

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
  // Calculate actual unit count from units array
  const actualUnitCount = building.units?.length || 0
  
  return (
    <BlocIQCard className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
      <BlocIQCardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#333333] group-hover:text-[#008C8F] transition-colors duration-300">
                {building.name}
              </h3>
              {building.address && (
                <p className="text-sm text-[#64748B] flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {building.address}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BlocIQBadge variant="secondary" size="sm">
              <Home className="h-3 w-3 mr-1" />
              {actualUnitCount} Unit{actualUnitCount !== 1 ? 's' : ''}
            </BlocIQBadge>
          </div>
        </div>
      </BlocIQCardHeader>
      
      <BlocIQCardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#64748B]">Total Units:</span>
            <span className="font-semibold text-[#333333]">{actualUnitCount}</span>
          </div>
          
          {building.units && building.units.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#333333]">Unit Overview</span>
                <BlocIQButton
                  variant="ghost"
                  size="sm"
                  onClick={onToggleUnitDetails}
                  className="text-[#008C8F] hover:text-[#0F5D5D]"
                >
                  {showUnitDetails ? 'Hide' : 'Show'} Details
                </BlocIQButton>
              </div>
              
              {showUnitDetails && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {building.units.slice(0, 5).map((unit) => (
                    <div key={unit.id} className="bg-[#F3F4F6] rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#333333]">{unit.unit_number}</span>
                        {unit.leaseholders && unit.leaseholders.length > 0 && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-[#64748B]" />
                            <span className="text-xs text-[#64748B]">{unit.leaseholders.length}</span>
                          </div>
                        )}
                      </div>
                      {unit.leaseholders && unit.leaseholders.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {unit.leaseholders.slice(0, 2).map((leaseholder) => (
                            <div key={leaseholder.id} className="text-xs text-[#64748B]">
                              {leaseholder.name}
                            </div>
                          ))}
                          {unit.leaseholders.length > 2 && (
                            <div className="text-xs text-[#64748B]">
                              +{unit.leaseholders.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {building.units.length > 5 && (
                    <div className="text-xs text-[#64748B] text-center py-2">
                      +{building.units.length - 5} more units
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="pt-4 border-t border-[#E2E8F0]">
            <Link href={`/buildings/${building.id}`}>
              <BlocIQButton className="w-full bg-gradient-to-r from-[#008C8F] to-[#007BDB] text-white hover:from-[#0F5D5D] hover:to-[#0066CC] transition-all duration-300">
                <Eye className="h-4 w-4 mr-2" />
                View Building
                <ArrowRight className="h-4 w-4 ml-2" />
              </BlocIQButton>
            </Link>
          </div>
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
  // Calculate actual unit count from units array
  const actualUnitCount = building.units?.length || 0
  
  return (
    <BlocIQCard className="group hover:shadow-lg transition-all duration-300 border-0 bg-white">
      <BlocIQCardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#333333] group-hover:text-[#008C8F] transition-colors duration-300">
                {building.name}
              </h3>
              {building.address && (
                <p className="text-sm text-[#64748B] flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {building.address}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-lg font-bold text-[#333333]">{actualUnitCount}</div>
              <div className="text-sm text-[#64748B]">Unit{actualUnitCount !== 1 ? 's' : ''}</div>
            </div>
            
            <div className="flex items-center gap-2">
              <BlocIQBadge variant="secondary" size="sm">
                <Home className="h-3 w-3 mr-1" />
                Active
              </BlocIQBadge>
            </div>
            
            <div className="flex items-center gap-2">
              <Link href={`/buildings/${building.id}`}>
                <BlocIQButton
                  variant="outline"
                  size="sm"
                  className="border-[#E2E8F0] text-[#64748B] hover:bg-[#F0FDFA]"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </BlocIQButton>
              </Link>
              <BlocIQButton
                size="sm"
                className="bg-gradient-to-r from-[#008C8F] to-[#007BDB] text-white"
              >
                <Users className="h-4 w-4 mr-1" />
                Manage
              </BlocIQButton>
              <BlocIQButton
                variant="ghost"
                size="sm"
                onClick={onToggleUnitDetails}
                className="text-[#008C8F] hover:text-[#0F5D5D]"
              >
                {showUnitDetails ? 'Hide' : 'Show'} Details
              </BlocIQButton>
            </div>
          </div>
        </div>
        
        {showUnitDetails && building.units && building.units.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
            <h4 className="font-semibold text-[#333333] mb-4">Units & Leaseholders</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {building.units.slice(0, 6).map((unit) => (
                <div key={unit.id} className="bg-[#F3F4F6] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#333333]">{unit.unit_number}</span>
                    {unit.leaseholders && unit.leaseholders.length > 0 && (
                      <BlocIQBadge variant="primary" size="sm">
                        {unit.leaseholders.length} leaseholder{unit.leaseholders.length !== 1 ? 's' : ''}
                      </BlocIQBadge>
                    )}
                  </div>
                  {unit.leaseholders && unit.leaseholders.length > 0 && (
                    <div className="space-y-2">
                      {unit.leaseholders.map((leaseholder) => (
                        <div key={leaseholder.id} className="text-sm">
                          <div className="font-medium text-[#333333]">{leaseholder.name}</div>
                          <div className="text-[#64748B]">{leaseholder.email}</div>
                          {leaseholder.phone && (
                            <div className="text-[#64748B]">{leaseholder.phone}</div>
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
      </BlocIQCardContent>
    </BlocIQCard>
  )
} 