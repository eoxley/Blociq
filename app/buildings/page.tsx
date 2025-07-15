import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BuildingsClient from './BuildingsClient'

interface Building {
  id: number
  name: string
  address: string | null
  unit_count: number | null
  created_at: string | null
  units?: any[]
  leases?: any[]
}

export default async function BuildingsPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Protect this route with Supabase Auth
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch all buildings with their units and leases
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
      ),
      leases (
        id,
        leaseholder_name,
        unit
      )
    `)
    .order('name')

  if (error) {
    console.error('Error fetching buildings:', error)
  }

  // Debug: Log the buildings data
  console.log('Buildings data:', buildings)
  console.log('Number of buildings:', buildings?.length || 0)
  console.log('Database error:', error)

  // If no buildings exist, try to create Ashwood House
  let finalBuildings = buildings || []
  
  if (!buildings || buildings.length === 0) {
    console.log('No buildings found, attempting to create Ashwood House...')
    
    // Try to insert Ashwood House
    const { data: newBuilding, error: insertError } = await supabase
      .from('buildings')
      .insert([
        {
          name: 'Ashwood House',
          address: 'Ashwood Lane, City Center',
          unit_count: 12,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (insertError) {
      console.error('Error inserting Ashwood House:', insertError)
    } else {
      console.log('Successfully created Ashwood House:', newBuilding)
      finalBuildings = newBuilding || []
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Buildings</h1>
        <p className="text-gray-600">Manage your property portfolio</p>
        {(!buildings || buildings.length === 0) && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Database Status:</strong> No buildings found in database. 
              {finalBuildings.length > 0 && ' Attempting to create sample building...'}
            </p>
            {error && (
              <p className="text-red-800 text-sm mt-2">
                <strong>Database Error:</strong> {error.message}
              </p>
            )}
          </div>
        )}
      </div>

      <BuildingsClient buildings={finalBuildings} />
    </div>
  )
} 