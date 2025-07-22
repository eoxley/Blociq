import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BuildingsClient from './BuildingsClient'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

interface Building {
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

export default async function BuildingsPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Protect this route with Supabase Auth
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  let buildings: Building[] = []

  try {
    // Fetch buildings with unit counts using a subquery
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
          building_id,
          leaseholders (
            id,
            name,
            email,
            phone
          )
        )
      `)
      .order('name')

    if (error) {
      console.error('Error fetching buildings:', error)
      throw error
    }

    // Transform the data to include actual unit counts
    buildings = (data || []).map(building => ({
      ...building,
      unit_count: building.units?.length || 0
    }))

    console.log(`✅ Successfully fetched ${buildings.length} buildings from database`)
    
  } catch (error) {
    console.error('Unexpected error in buildings page:', error)
    buildings = []
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {buildings.length === 0 && (
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