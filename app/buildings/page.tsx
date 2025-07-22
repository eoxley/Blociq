import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BuildingsClient from './BuildingsClient'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
  created_at: string | null
  demo_ready?: boolean | null
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

export default async function BuildingsPage() {
  const supabase = createClient(cookies())
  
  // Protect this route with Supabase Auth
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  let buildings: Building[] = []
  let errorMessage = ''

  try {
    console.log('🔍 Fetching buildings from database...')
    
    // First, let's check if the buildings table exists and has data
    const { count: buildingCount, error: countError } = await supabase
      .from('buildings')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Error checking building count:', countError)
      errorMessage = `Database error: ${countError.message}`
    } else {
      console.log(`📊 Found ${buildingCount} buildings in database`)
    }

    // Fetch buildings with their actual units to calculate unit counts
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        id,
        name,
        address,
        unit_count,
        created_at,
        demo_ready,
        units (
          id,
          unit_number,
          building_id
        )
      `)
      .order('name')

    if (error) {
      console.error('❌ Error fetching buildings:', error)
      errorMessage = `Failed to fetch buildings: ${error.message}`
      throw error
    }

    console.log('📋 Raw buildings data:', data)

    // Transform the data to calculate actual unit counts from the units array
    buildings = (data || []).map(building => ({
      ...building,
      unit_count: building.units?.length || 0, // Calculate from actual units
      units: building.units || []
    }))

    console.log(`✅ Successfully fetched ${buildings.length} buildings from database`)
    console.log('🏢 Buildings with actual unit counts:', buildings.map(b => ({ 
      id: b.id, 
      name: b.name, 
      unit_count: b.unit_count,
      units_count: b.units?.length || 0 
    })))
    
  } catch (error) {
    console.error('❌ Unexpected error in buildings page:', error)
    errorMessage = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    buildings = []
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              <strong>Error loading buildings:</strong> {errorMessage}
            </p>
          </div>
        )}

        {buildings.length === 0 && !errorMessage && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>No buildings found:</strong> The database doesn't contain any buildings yet. Add your first building to get started.
            </p>
          </div>
        )}

        <BuildingsClient buildings={buildings} />
      </div>
    </LayoutWithSidebar>
  )
} 