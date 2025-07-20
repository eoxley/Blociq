import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingDetailClient from './BuildingDetailClient'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function BuildingDetailPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  const { buildingId } = await params
  const supabase = createServerComponentClient({ cookies })
  
  // Secure the route using Supabase Auth
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Temporarily allow access for demonstration purposes
  // if (!session) {
  //   redirect('/login')
  // }

  // Example building data for demonstration
  const exampleBuildings = {
    "1": {
      id: 1,
      name: "Test Property",
      address: "123 Test Street, London, SW1A 1AA",
      unit_count: 12,
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
        { id: 12, unit_number: "Flat 12", building_id: 1 }
      ],
      leases: [
        { id: 1, leaseholder_name: "John Smith", unit: 1 },
        { id: 2, leaseholder_name: "Sarah Johnson", unit: 2 },
        { id: 3, leaseholder_name: "Michael Brown", unit: 3 },
        { id: 4, leaseholder_name: "Emma Davis", unit: 4 },
        { id: 5, leaseholder_name: "David Wilson", unit: 5 },
        { id: 6, leaseholder_name: "Lisa Anderson", unit: 6 },
        { id: 7, leaseholder_name: "Robert Taylor", unit: 7 },
        { id: 8, leaseholder_name: "Jennifer Garcia", unit: 8 },
        { id: 9, leaseholder_name: "Christopher Martinez", unit: 9 },
        { id: 10, leaseholder_name: "Amanda Rodriguez", unit: 10 },
        { id: 11, leaseholder_name: "James Lopez", unit: 11 },
        { id: 12, leaseholder_name: "Michelle Gonzalez", unit: 12 }
      ]
    },
    "2": {
      id: 2,
      name: "XX Building",
      address: "456 Example Road, Manchester, M1 1AA",
      unit_count: 8,
      created_at: new Date().toISOString(),
      demo_ready: true,
      units: [
        { id: 13, unit_number: "Apartment A", building_id: 2 },
        { id: 14, unit_number: "Apartment B", building_id: 2 },
        { id: 15, unit_number: "Apartment C", building_id: 2 },
        { id: 16, unit_number: "Apartment D", building_id: 2 },
        { id: 17, unit_number: "Apartment E", building_id: 2 },
        { id: 18, unit_number: "Apartment F", building_id: 2 },
        { id: 19, unit_number: "Apartment G", building_id: 2 },
        { id: 20, unit_number: "Apartment H", building_id: 2 }
      ],
      leases: [
        { id: 13, leaseholder_name: "Thomas Moore", unit: 13 },
        { id: 14, leaseholder_name: "Jessica Lee", unit: 14 },
        { id: 15, leaseholder_name: "Daniel White", unit: 15 },
        { id: 16, leaseholder_name: "Nicole Clark", unit: 16 },
        { id: 17, leaseholder_name: "Kevin Hall", unit: 17 },
        { id: 18, leaseholder_name: "Rachel Lewis", unit: 18 },
        { id: 19, leaseholder_name: "Steven Walker", unit: 19 },
        { id: 20, leaseholder_name: "Laura Allen", unit: 20 }
      ]
    },
    "3": {
      id: 3,
      name: "Sample Complex",
      address: "789 Demo Avenue, Birmingham, B1 1AA",
      unit_count: 24,
      created_at: new Date().toISOString(),
      demo_ready: false,
      units: [
        { id: 21, unit_number: "Unit 1A", building_id: 3 },
        { id: 22, unit_number: "Unit 1B", building_id: 3 },
        { id: 23, unit_number: "Unit 2A", building_id: 3 },
        { id: 24, unit_number: "Unit 2B", building_id: 3 },
        { id: 25, unit_number: "Unit 3A", building_id: 3 },
        { id: 26, unit_number: "Unit 3B", building_id: 3 },
        { id: 27, unit_number: "Unit 4A", building_id: 3 },
        { id: 28, unit_number: "Unit 4B", building_id: 3 },
        { id: 29, unit_number: "Unit 5A", building_id: 3 },
        { id: 30, unit_number: "Unit 5B", building_id: 3 },
        { id: 31, unit_number: "Unit 6A", building_id: 3 },
        { id: 32, unit_number: "Unit 6B", building_id: 3 },
        { id: 33, unit_number: "Unit 7A", building_id: 3 },
        { id: 34, unit_number: "Unit 7B", building_id: 3 },
        { id: 35, unit_number: "Unit 8A", building_id: 3 },
        { id: 36, unit_number: "Unit 8B", building_id: 3 },
        { id: 37, unit_number: "Unit 9A", building_id: 3 },
        { id: 38, unit_number: "Unit 9B", building_id: 3 },
        { id: 39, unit_number: "Unit 10A", building_id: 3 },
        { id: 40, unit_number: "Unit 10B", building_id: 3 },
        { id: 41, unit_number: "Unit 11A", building_id: 3 },
        { id: 42, unit_number: "Unit 11B", building_id: 3 },
        { id: 43, unit_number: "Unit 12A", building_id: 3 },
        { id: 44, unit_number: "Unit 12B", building_id: 3 }
      ],
      leases: [
        { id: 21, leaseholder_name: "Mark Young", unit: 21 },
        { id: 22, leaseholder_name: "Stephanie King", unit: 22 },
        { id: 23, leaseholder_name: "Andrew Wright", unit: 23 },
        { id: 24, leaseholder_name: "Melissa Green", unit: 24 },
        { id: 25, leaseholder_name: "Ryan Baker", unit: 25 },
        { id: 26, leaseholder_name: "Heather Adams", unit: 26 },
        { id: 27, leaseholder_name: "Jason Nelson", unit: 27 },
        { id: 28, leaseholder_name: "Amber Carter", unit: 28 },
        { id: 29, leaseholder_name: "Eric Mitchell", unit: 29 },
        { id: 30, leaseholder_name: "Danielle Perez", unit: 30 },
        { id: 31, leaseholder_name: "Timothy Roberts", unit: 31 },
        { id: 32, leaseholder_name: "Brittany Turner", unit: 32 },
        { id: 33, leaseholder_name: "Nathan Phillips", unit: 33 },
        { id: 34, leaseholder_name: "Megan Campbell", unit: 34 },
        { id: 35, leaseholder_name: "Gregory Parker", unit: 35 },
        { id: 36, leaseholder_name: "Christine Evans", unit: 36 },
        { id: 37, leaseholder_name: "Brandon Edwards", unit: 37 },
        { id: 38, leaseholder_name: "Samantha Collins", unit: 38 },
        { id: 39, leaseholder_name: "Tyler Stewart", unit: 39 },
        { id: 40, leaseholder_name: "Natalie Morris", unit: 40 },
        { id: 41, leaseholder_name: "Kyle Rogers", unit: 41 },
        { id: 42, leaseholder_name: "Vanessa Reed", unit: 42 },
        { id: 43, leaseholder_name: "Jeffrey Cook", unit: 43 },
        { id: 44, leaseholder_name: "Tiffany Morgan", unit: 44 }
      ]
    }
  }

  // Try to get building from database first, then fall back to example data
  let building = null
  let buildingError = null

  try {
    const { data: dbBuilding, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()
    
    building = dbBuilding
    buildingError = error
  } catch (error) {
    buildingError = error
  }

  // If no building found in database, try example data
  if (buildingError || !building) {
    building = exampleBuildings[buildingId as keyof typeof exampleBuildings]
  }

  if (!building) {
    redirect('/buildings')
  }

  // Fetch recent emails for this building
  const { data: recentEmails, error: emailsError } = await supabase
    .from('incoming_emails')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (emailsError) {
    console.error('Error fetching emails:', emailsError)
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header with Back to Buildings navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/buildings" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Buildings
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">{building.name}</h1>
            <p className="text-gray-600">Building details and management</p>
          </div>
        </div>

        <BuildingDetailClient 
          building={building} 
          recentEmails={recentEmails || []}
        />
      </div>
    </LayoutWithSidebar>
  )
} 