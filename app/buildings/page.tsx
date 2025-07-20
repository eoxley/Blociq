import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BuildingsClient from './BuildingsClient'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

  // Temporarily allow access for demonstration purposes
  // if (!session) {
  //   redirect('/login')
  // }

  let finalBuildings: Building[] = []

  try {
    // First, try a simple query to get just buildings
    const { data: simpleBuildings, error: simpleError } = await supabase
      .from('buildings')
      .select('*')
      .order('name')

    console.log('Simple buildings query result:', simpleBuildings)
    console.log('Simple buildings error:', simpleError)

    if (simpleError) {
      console.error('Simple query error:', simpleError)
    }

    // Then try the complex query with units and leaseholders
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select(`
        id,
        name,
        address,
        unit_count,
        created_at,
        units (
          id,
          unit_number,
          building_id
        )
      `)
      .order('name')

    console.log('Complex buildings query result:', buildings)
    console.log('Complex buildings error:', error)

    if (error) {
      console.error('Error fetching buildings:', error)
    }

    // Use simple buildings if complex query fails, or example data for demonstration
    finalBuildings = buildings || simpleBuildings || []
    
    // Remove duplicate buildings by name (keep the first one)
    const uniqueBuildings = finalBuildings.reduce((acc: Building[], building) => {
      const existingBuilding = acc.find(b => b.name === building.name)
      if (!existingBuilding) {
        acc.push(building)
      } else {
        console.log(`🔄 Removing duplicate building: ${building.name} (ID: ${building.id})`)
      }
      return acc
    }, [])
    
    finalBuildings = uniqueBuildings
    
  } catch (error) {
    console.error('Unexpected error in buildings page:', error)
    finalBuildings = []
  }
  
  // Remove all dummy data - show empty state if no real buildings found
  // if (finalBuildings.length === 0) {
  //   finalBuildings = [
  //     // All dummy data removed
  //   ]
  // }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {finalBuildings.length === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Debug:</strong> No buildings found in database. Using demo data.
            </p>
          </div>
        )}

        <BuildingsClient buildings={finalBuildings} />
      </div>
    </LayoutWithSidebar>
  )
} 