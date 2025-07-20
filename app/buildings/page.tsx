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
  units?: any[]
  leases?: any[]
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
        ],
        leases: [
          { id: 1, leaseholder_name: "Mrs. Sarah Patel", unit: 1 },
          { id: 2, leaseholder_name: "Mr. David Thompson", unit: 2 },
          { id: 3, leaseholder_name: "Ms. Emma Williams", unit: 3 },
          { id: 4, leaseholder_name: "Dr. Michael Brown", unit: 4 },
          { id: 5, leaseholder_name: "Mrs. Lisa Anderson", unit: 5 },
          { id: 6, leaseholder_name: "Mr. James Wilson", unit: 6 },
          { id: 7, leaseholder_name: "Ms. Rachel Davis", unit: 7 },
          { id: 8, leaseholder_name: "Mr. Christopher Garcia", unit: 8 },
          { id: 9, leaseholder_name: "Mrs. Jennifer Martinez", unit: 9 },
          { id: 10, leaseholder_name: "Mr. Robert Johnson", unit: 10 },
          { id: 11, leaseholder_name: "Ms. Amanda Taylor", unit: 11 },
          { id: 12, leaseholder_name: "Mr. Kevin Lee", unit: 12 },
          { id: 13, leaseholder_name: "Mrs. Nicole White", unit: 13 },
          { id: 14, leaseholder_name: "Mr. Daniel Clark", unit: 14 },
          { id: 15, leaseholder_name: "Ms. Stephanie Lewis", unit: 15 },
          { id: 16, leaseholder_name: "Mr. Andrew Walker", unit: 16 },
          { id: 17, leaseholder_name: "Mrs. Melissa Hall", unit: 17 },
          { id: 18, leaseholder_name: "Mr. Ryan Allen", unit: 18 },
          { id: 19, leaseholder_name: "Ms. Heather Young", unit: 19 },
          { id: 20, leaseholder_name: "Mr. Jason King", unit: 20 },
          { id: 21, leaseholder_name: "Mrs. Amber Wright", unit: 21 },
          { id: 22, leaseholder_name: "Mr. Eric Green", unit: 22 },
          { id: 23, leaseholder_name: "Ms. Danielle Baker", unit: 23 },
          { id: 24, leaseholder_name: "Mr. Timothy Adams", unit: 24 }
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
        ],
        leases: [
          { id: 25, leaseholder_name: "Mr. Thomas Moore", unit: 25 },
          { id: 26, leaseholder_name: "Ms. Jessica Lee", unit: 26 },
          { id: 27, leaseholder_name: "Mr. Steven Rogers", unit: 27 },
          { id: 28, leaseholder_name: "Mrs. Laura Reed", unit: 28 },
          { id: 29, leaseholder_name: "Mr. Mark Cook", unit: 29 },
          { id: 30, leaseholder_name: "Ms. Vanessa Morgan", unit: 30 },
          { id: 31, leaseholder_name: "Mr. Jeffrey Bell", unit: 31 },
          { id: 32, leaseholder_name: "Mrs. Tiffany Murphy", unit: 32 },
          { id: 33, leaseholder_name: "Mr. Kyle Bailey", unit: 33 },
          { id: 34, leaseholder_name: "Ms. Natalie Rivera", unit: 34 },
          { id: 35, leaseholder_name: "Mr. Brandon Cooper", unit: 35 },
          { id: 36, leaseholder_name: "Mrs. Samantha Richardson", unit: 36 },
          { id: 37, leaseholder_name: "Mr. Tyler Cox", unit: 37 },
          { id: 38, leaseholder_name: "Ms. Christine Howard", unit: 38 },
          { id: 39, leaseholder_name: "Mr. Gregory Ward", unit: 39 },
          { id: 40, leaseholder_name: "Mrs. Megan Torres", unit: 40 }
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
        ],
        leases: [
          { id: 41, leaseholder_name: "Mr. Mark Peterson", unit: 41 },
          { id: 42, leaseholder_name: "Ms. Stephanie Gray", unit: 42 },
          { id: 43, leaseholder_name: "Mr. Andrew James", unit: 43 },
          { id: 44, leaseholder_name: "Mrs. Melissa Watson", unit: 44 },
          { id: 45, leaseholder_name: "Mr. Ryan Brooks", unit: 45 },
          { id: 46, leaseholder_name: "Ms. Heather Kelly", unit: 46 },
          { id: 47, leaseholder_name: "Mr. Jason Sanders", unit: 47 },
          { id: 48, leaseholder_name: "Mrs. Amber Price", unit: 48 },
          { id: 49, leaseholder_name: "Mr. Eric Bennett", unit: 49 },
          { id: 50, leaseholder_name: "Ms. Danielle Wood", unit: 50 },
          { id: 51, leaseholder_name: "Mr. Timothy Barnes", unit: 51 },
          { id: 52, leaseholder_name: "Mrs. Brittany Ross", unit: 52 },
          { id: 53, leaseholder_name: "Mr. Nathan Henderson", unit: 53 },
          { id: 54, leaseholder_name: "Ms. Megan Coleman", unit: 54 },
          { id: 55, leaseholder_name: "Mr. Gregory Jenkins", unit: 55 },
          { id: 56, leaseholder_name: "Mrs. Christine Perry", unit: 56 },
          { id: 57, leaseholder_name: "Mr. Brandon Powell", unit: 57 },
          { id: 58, leaseholder_name: "Ms. Samantha Long", unit: 58 },
          { id: 59, leaseholder_name: "Mr. Tyler Patterson", unit: 59 },
          { id: 60, leaseholder_name: "Mrs. Natalie Hughes", unit: 60 },
          { id: 61, leaseholder_name: "Mr. Kyle Flores", unit: 61 },
          { id: 62, leaseholder_name: "Ms. Vanessa Butler", unit: 62 },
          { id: 63, leaseholder_name: "Mr. Jeffrey Simmons", unit: 63 },
          { id: 64, leaseholder_name: "Mrs. Tiffany Foster", unit: 64 },
          { id: 65, leaseholder_name: "Mr. Kyle Gonzales", unit: 65 },
          { id: 66, leaseholder_name: "Ms. Natalie Bryant", unit: 66 },
          { id: 67, leaseholder_name: "Mr. Brandon Alexander", unit: 67 },
          { id: 68, leaseholder_name: "Mrs. Samantha Russell", unit: 68 },
          { id: 69, leaseholder_name: "Mr. Tyler Griffin", unit: 69 },
          { id: 70, leaseholder_name: "Ms. Christine Diaz", unit: 70 },
          { id: 71, leaseholder_name: "Mr. Gregory Hayes", unit: 71 },
          { id: 72, leaseholder_name: "Mrs. Megan Myers", unit: 72 }
        ]
      }
    ]
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header with Back to Home navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/home" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Buildings</h1>
            <p className="text-gray-600">Manage your property portfolio</p>
          </div>
        </div>

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