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

interface Building {
  id: string
  name: string
  address: string
  unit_count: number
  is_hrb: boolean
  created_at: string
  agency_id: string
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userAgency, setUserAgency] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchUserAgencyAndBuildings()
  }, [])

  const fetchUserAgencyAndBuildings = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('User not authenticated')
        return
      }

      // Get user's agency
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        return
      }

      setUserAgency(userProfile.agency_id)

      // Fetch buildings for user's agency only
      if (userProfile.agency_id) {
        const { data: buildingsData, error: buildingsError } = await supabase
          .from('buildings')
          .select('*')
          .eq('agency_id', userProfile.agency_id)
          .order('name', { ascending: true })

        if (buildingsError) {
          console.error('Error fetching buildings:', buildingsError)
        } else {
          setBuildings(buildingsData || [])
        }
      }
    } catch (error) {
      console.error('Error in fetchUserAgencyAndBuildings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBuildings = useMemo(() => {
    if (!searchTerm) return buildings
    return buildings.filter(building =>
      building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [buildings, searchTerm])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading buildings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Buildings</h1>
              <p className="mt-2 text-gray-600">
                Manage your property portfolio
              </p>
            </div>
            <Link href="/buildings/new">
              <BlocIQButton>
                <Plus className="h-4 w-4 mr-2" />
                Add Building
              </BlocIQButton>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search buildings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Buildings Grid */}
        {filteredBuildings.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No buildings found' : 'No buildings yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Get started by adding your first building'
              }
            </p>
            {!searchTerm && (
              <Link href="/buildings/new">
                <BlocIQButton>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Building
                </BlocIQButton>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBuildings.map((building) => (
              <div
                key={building.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Building Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-blue-600" />
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
          </div>
        )}
      </div>
    </div>
  )
} 