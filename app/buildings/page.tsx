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

  // First, try a simple query to get just buildings
  const { data: simpleBuildings, error: simpleError } = await supabase
    .from('buildings')
    .select('*')
    .order('name')

  console.log('Simple buildings query result:', simpleBuildings)
  console.log('Simple buildings error:', simpleError)

  // Then try the complex query with units and leases
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

  console.log('Complex buildings query result:', buildings)
  console.log('Complex buildings error:', error)

  if (error) {
    console.error('Error fetching buildings:', error)
  }

  // Use simple buildings if complex query fails
  const finalBuildings = buildings || simpleBuildings || []

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Buildings</h1>
        <p className="text-gray-600">Manage your property portfolio</p>
        {finalBuildings.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Debug:</strong> No buildings found in database. 
              {simpleBuildings && simpleBuildings.length > 0 && ' Simple query found buildings but complex query failed.'}
              {error && ` Error: ${error.message}`}
            </p>
          </div>
        )}
      </div>

      <BuildingsClient buildings={finalBuildings} />
    </div>
  )
} 