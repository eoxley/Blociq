'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { 
  Building2, 
  MapPin, 
  Users, 
  Plus,
  Eye,
  ArrowRight,
  Search,
  Shield,
  Sparkles
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Hardcoded dummy buildings for demo purposes
const dummyBuildings = [
  { 
    id: 'dummy-1', 
    name: "Kingsmere House", 
    address: "Wimbledon, London SW19", 
    units: 42,
    isDummy: true,
    is_hrb: true
  },
  { 
    id: 'dummy-2', 
    name: "Harbour View", 
    address: "Brighton Seafront, BN1", 
    units: 28,
    isDummy: true,
    is_hrb: true
  },
  { 
    id: 'dummy-3', 
    name: "Maple Row", 
    address: "Guildford, Surrey GU1", 
    units: 16,
    isDummy: true
  },
  { 
    id: 'dummy-4', 
    name: "Riverside Court", 
    address: "Kingston upon Thames, KT1", 
    units: 35,
    isDummy: true
  },
  { 
    id: 'dummy-5', 
    name: "Oakwood Gardens", 
    address: "Epsom, Surrey KT18", 
    units: 24,
    isDummy: true,
    is_hrb: true
  },
  { 
    id: 'dummy-6', 
    name: "Victoria Heights", 
    address: "Croydon, London CR0", 
    units: 31,
    isDummy: true
  },
  { 
    id: 'dummy-7', 
    name: "Parkview Apartments", 
    address: "Sutton, Surrey SM1", 
    units: 19,
    isDummy: true
  },
  { 
    id: 'dummy-8', 
    name: "The Regency", 
    address: "Worthing, West Sussex BN11", 
    units: 22,
    isDummy: true
  },
  { 
    id: 'dummy-9', 
    name: "Marina Point", 
    address: "Portsmouth, Hampshire PO1", 
    units: 38,
    isDummy: true
  },
  { 
    id: 'dummy-10', 
    name: "St. James Court", 
    address: "Southampton, Hampshire SO14", 
    units: 27,
    isDummy: true
  },
  { 
    id: 'dummy-11', 
    name: "The Grand", 
    address: "Bournemouth, Dorset BH1", 
    units: 33,
    isDummy: true
  },
  { 
    id: 'dummy-12', 
    name: "Cliffside Manor",
    address: "Eastbourne, East Sussex BN20",
    units: 26,
    isDummy: true
  }
]

function BuildingsList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [realBuildings, setRealBuildings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userBuildings, setUserBuildings] = useState<any[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchRealBuildings = async () => {
      try {
        setIsLoading(true)
        
        // First, get the current user's session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          console.log('No session found, skipping real buildings fetch')
          setRealBuildings([])
          return
        }

        // Get buildings the user has access to
        const { data: userAccess, error: accessError } = await supabase
          .from('building_users')
          .select(`
            building_id,
            buildings (
              id,
              name,
              address,
              unit_count,
              created_at
            )
          `)
          .eq('user_id', session.user.id)

        if (accessError) {
          console.error('Error fetching user building access:', accessError)
          setRealBuildings([])
          return
        }

        // Set user buildings for access control
        setUserBuildings(userAccess || [])

        // Only fetch buildings the user has access to
        if (userAccess && userAccess.length > 0) {
          const buildingIds = userAccess.map(ub => ub.building_id)
          
          const { data: buildings, error: buildingsError } = await supabase
            .from('buildings')
            .select('id, name, address, unit_count, created_at')
            .in('id', buildingIds)
            .order('name')

          if (buildingsError) {
            console.error('Error fetching buildings:', buildingsError)
            setRealBuildings([])
          } else {
            setRealBuildings(buildings || [])
          }
        } else {
          // User has no building access
          setRealBuildings([])
        }
      } catch (error) {
        console.error('Error in fetchRealBuildings:', error)
        setRealBuildings([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRealBuildings()
  }, [supabase])

  // Combine real and dummy buildings
  const combinedBuildings = useMemo(() => {
    return [...realBuildings, ...dummyBuildings]
  }, [realBuildings])

  // Filter buildings based on search term (case-insensitive)
  const filteredBuildings = useMemo(() => {
    if (!searchQuery.trim()) return combinedBuildings
    
    return combinedBuildings.filter(building => {
      const searchLower = searchQuery.toLowerCase()
      const nameMatch = building.name.toLowerCase().includes(searchLower)
      const addressMatch = building.address.toLowerCase().includes(searchLower)
      return nameMatch || addressMatch
    })
  }, [combinedBuildings, searchQuery])

  // Calculate HRB and total units
  const hrbBuildings = useMemo(() => {
    return combinedBuildings.filter(building => building.is_hrb)
  }, [combinedBuildings])

  const totalUnits = useMemo(() => {
    return combinedBuildings.reduce((sum, building) => sum + (building.units || building.unit_count || 0), 0)
  }, [combinedBuildings])

  // Check if user has access to a building
  const hasUserAccess = (buildingId: string) => {
    if (buildingId.startsWith('dummy-')) return false // Dummy buildings are demo only
    return userBuildings.some(ub => ub.building_id === buildingId)
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 px-6 rounded-3xl mb-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Building Portfolio
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Manage your property portfolio with comprehensive oversight, compliance tracking, and operational insights.
          </p>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search buildings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{combinedBuildings.length}</div>
              <div className="text-gray-600">Buildings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{hrbBuildings.length}</div>
              <div className="text-gray-600">HRB</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalUnits}</div>
              <div className="text-gray-600">Units</div>
            </div>
          </div>
        </div>
      </div>

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Real Buildings */}
        {realBuildings.map((building) => (
          <div
            key={building.id}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
          >
            {/* Building Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="h-6 w-6" />
                <Shield className="h-5 w-5 opacity-80" />
              </div>
              <div className="text-sm opacity-90">Real Building</div>
            </div>

            {/* Building Info */}
            <div className="px-6 pb-6 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{building.name}</h3>
              <p className="text-gray-600 mb-4 font-medium">{building.address}</p>
              <div className="text-gray-700 font-semibold mb-6">{building.unit_count || 0} Units</div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href={`/buildings/${building.id}`}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl py-3 block text-center"
                >
                  View Building
                </Link>
                <Link
                  href={`/buildings/${building.id}/compliance`}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl py-3 block text-center"
                >
                  View Compliance
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Demo Building Tiles */}
        {dummyBuildings.map((building) => (
          <div
            key={building.id}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
          >
            {/* Building Header */}
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="h-6 w-6" />
                <Sparkles className="h-5 w-5 opacity-80" />
              </div>
              <div className="text-sm opacity-90">Demo Building</div>
            </div>

            {/* Building Info */}
            <div className="px-6 pb-6 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{building.name}</h3>
              <p className="text-gray-600 mb-4 font-medium">{building.address}</p>
              <div className="text-gray-700 font-semibold mb-6">{building.units} Units</div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl py-3 cursor-not-allowed opacity-75"
                  disabled
                >
                  Demo Only
                </button>
                <button
                  className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 transition-all duration-300 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl py-3 cursor-not-allowed opacity-75"
                  disabled
                >
                  Demo Only
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Access Message */}
      {realBuildings.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Building Access</h3>
          <p className="text-gray-600 mb-6">
            You don't have access to any buildings yet. Contact your administrator to get building access.
          </p>
          <BlocIQButton variant="primary" size="lg">
            Contact Admin
          </BlocIQButton>
        </div>
      )}
    </div>
  )
}

// Main component that renders the buildings list
export default function BuildingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BuildingsList />
      </div>
    </div>
  )
} 