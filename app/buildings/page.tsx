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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Buildings</h1>
        <p className="text-gray-600">Manage your property portfolio</p>
        {(!buildings || buildings.length === 0) && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>No buildings found:</strong> The database query returned no results.
            </p>
          </div>
        )}
      </div>

      <BuildingsClient buildings={buildings || []} />
    </div>
  )
} 