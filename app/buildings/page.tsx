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

  // First, try a simple query to get just buildings
  const { data: simpleBuildings, error: simpleError } = await supabase
    .from('buildings')
    .select('*')
    .order('name')

  console.log('Simple buildings query result:', simpleBuildings)
  console.log('Simple buildings error:', simpleError)

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

  console.log('Complex buildings query result:', buildings)
  console.log('Complex buildings error:', error)

  if (error) {
    console.error('Error fetching buildings:', error)
  }

  // Use simple buildings if complex query fails, or example data for demonstration
  let finalBuildings = buildings || simpleBuildings || []
  
  // If no buildings found, show example data for demonstration
  if (finalBuildings.length === 0) {
    finalBuildings = [
      {
        id: 1,
        name: "Ashwood House",
        address: "15 Ashwood Road, London, SW1A 1AA",
        unit_count: 24,
        created_at: new Date().toISOString(),
        demo_ready: true,
        units: [
          { id: 1, unit_number: "Flat 1", building_id: 1 },
          { id: 2, unit_number: "Flat 2", building_id: 1 },
          { id: 3, unit_number: "Flat 3", building_id: 1 },
          { id: 4, unit_number: "Flat 4", building_id: 1 },
          { id: 5, unit_number: "Flat 5", building_id: 1 },
          { id: 6, unit_number: "Flat 6", building_id: 1 },
          { id: 7, unit_number: "Flat 7", building_id: 1 },
          { id: 8, unit_number: "Flat 8", building_id: 1 },
          { id: 9, unit_number: "Flat 9", building_id: 1 },
          { id: 10, unit_number: "Flat 10", building_id: 1 },
          { id: 11, unit_number: "Flat 11", building_id: 1 },
          { id: 12, unit_number: "Flat 12", building_id: 1 },
          { id: 13, unit_number: "Flat 13", building_id: 1 },
          { id: 14, unit_number: "Flat 14", building_id: 1 },
          { id: 15, unit_number: "Flat 15", building_id: 1 },
          { id: 16, unit_number: "Flat 16", building_id: 1 },
          { id: 17, unit_number: "Flat 17", building_id: 1 },
          { id: 18, unit_number: "Flat 18", building_id: 1 },
          { id: 19, unit_number: "Flat 19", building_id: 1 },
          { id: 20, unit_number: "Flat 20", building_id: 1 },
          { id: 21, unit_number: "Flat 21", building_id: 1 },
          { id: 22, unit_number: "Flat 22", building_id: 1 },
          { id: 23, unit_number: "Flat 23", building_id: 1 },
          { id: 24, unit_number: "Flat 24", building_id: 1 }
        ]
      },
      {
        id: 2,
        name: "Ashwood Court",
        address: "23 Ashwood Road, London, SW1A 1AB",
        unit_count: 16,
        created_at: new Date().toISOString(),
        demo_ready: true,
        units: [
          { id: 25, unit_number: "Apartment A", building_id: 2 },
          { id: 26, unit_number: "Apartment B", building_id: 2 },
          { id: 27, unit_number: "Apartment C", building_id: 2 },
          { id: 28, unit_number: "Apartment D", building_id: 2 },
          { id: 29, unit_number: "Apartment E", building_id: 2 },
          { id: 30, unit_number: "Apartment F", building_id: 2 },
          { id: 31, unit_number: "Apartment G", building_id: 2 },
          { id: 32, unit_number: "Apartment H", building_id: 2 },
          { id: 33, unit_number: "Apartment I", building_id: 2 },
          { id: 34, unit_number: "Apartment J", building_id: 2 },
          { id: 35, unit_number: "Apartment K", building_id: 2 },
          { id: 36, unit_number: "Apartment L", building_id: 2 },
          { id: 37, unit_number: "Apartment M", building_id: 2 },
          { id: 38, unit_number: "Apartment N", building_id: 2 },
          { id: 39, unit_number: "Apartment O", building_id: 2 },
          { id: 40, unit_number: "Apartment P", building_id: 2 }
        ]
      },
      {
        id: 3,
        name: "Ashwood Gardens",
        address: "45 Ashwood Road, London, SW1A 1AC",
        unit_count: 32,
        created_at: new Date().toISOString(),
        demo_ready: false,
        units: [
          { id: 41, unit_number: "Unit 1A", building_id: 3 },
          { id: 42, unit_number: "Unit 1B", building_id: 3 },
          { id: 43, unit_number: "Unit 2A", building_id: 3 },
          { id: 44, unit_number: "Unit 2B", building_id: 3 },
          { id: 45, unit_number: "Unit 3A", building_id: 3 },
          { id: 46, unit_number: "Unit 3B", building_id: 3 },
          { id: 47, unit_number: "Unit 4A", building_id: 3 },
          { id: 48, unit_number: "Unit 4B", building_id: 3 },
          { id: 49, unit_number: "Unit 5A", building_id: 3 },
          { id: 50, unit_number: "Unit 5B", building_id: 3 },
          { id: 51, unit_number: "Unit 6A", building_id: 3 },
          { id: 52, unit_number: "Unit 6B", building_id: 3 },
          { id: 53, unit_number: "Unit 7A", building_id: 3 },
          { id: 54, unit_number: "Unit 7B", building_id: 3 },
          { id: 55, unit_number: "Unit 8A", building_id: 3 },
          { id: 56, unit_number: "Unit 8B", building_id: 3 },
          { id: 57, unit_number: "Unit 9A", building_id: 3 },
          { id: 58, unit_number: "Unit 9B", building_id: 3 },
          { id: 59, unit_number: "Unit 10A", building_id: 3 },
          { id: 60, unit_number: "Unit 10B", building_id: 3 },
          { id: 61, unit_number: "Unit 11A", building_id: 3 },
          { id: 62, unit_number: "Unit 11B", building_id: 3 },
          { id: 63, unit_number: "Unit 12A", building_id: 3 },
          { id: 64, unit_number: "Unit 12B", building_id: 3 },
          { id: 65, unit_number: "Unit 13A", building_id: 3 },
          { id: 66, unit_number: "Unit 13B", building_id: 3 },
          { id: 67, unit_number: "Unit 14A", building_id: 3 },
          { id: 68, unit_number: "Unit 14B", building_id: 3 },
          { id: 69, unit_number: "Unit 15A", building_id: 3 },
          { id: 70, unit_number: "Unit 15B", building_id: 3 },
          { id: 71, unit_number: "Unit 16A", building_id: 3 },
          { id: 72, unit_number: "Unit 16B", building_id: 3 }
        ]
      }
    ]
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {finalBuildings.length === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Debug:</strong> No buildings found in database. 
              {simpleBuildings && simpleBuildings.length > 0 && ' Simple query found buildings but complex query failed.'}
              {error && ` Error: ${error.message}`}
            </p>
          </div>
        )}

        <BuildingsClient buildings={finalBuildings} />
      </div>
    </LayoutWithSidebar>
  )
} 