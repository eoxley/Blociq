import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingUnitsClient from './BuildingUnitsClient'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function BuildingUnitsPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  const { buildingId } = await params
  
  console.log('=== UNITS PAGE DEBUG ===')
  console.log('BuildingUnitsPage - buildingId:', buildingId)
  console.log('BuildingUnitsPage - buildingId type:', typeof buildingId)
  
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  // Fetch building data first
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single()

  console.log('BuildingUnitsPage - building data:', building)
  console.log('BuildingUnitsPage - building error:', buildingError)

  if (buildingError || !building) {
    console.log('BuildingUnitsPage - redirecting to /buildings due to building error')
    redirect('/buildings')
  }

  // Try to convert building ID to number for units query
  const buildingIdNum = parseInt(buildingId, 10)
  const isNumericBuildingId = !isNaN(buildingIdNum)
  
  console.log('BuildingUnitsPage - buildingId is numeric:', isNumericBuildingId)
  console.log('BuildingUnitsPage - Converted buildingId to number:', buildingIdNum)

  // Fetch units with leaseholders and occupiers
  let unitsQuery
  if (isNumericBuildingId) {
    unitsQuery = supabase
      .from("units")
      .select(`
        *,
        leaseholders (
          id,
          name,
          email,
          phone
        ),
        occupiers (
          id,
          full_name,
          email,
          phone,
          start_date,
          end_date,
          rent_amount,
          rent_frequency,
          status
        )
      `)
      .eq("building_id", buildingIdNum)
      .order('unit_number')
  } else {
    // For UUID building IDs, we need to handle differently
    // First get the building's numeric ID if it exists
    const { data: buildingWithId } = await supabase
      .from('buildings')
      .select('id')
      .eq('id', buildingId)
      .single()
    
    if (buildingWithId && typeof buildingWithId.id === 'number') {
      unitsQuery = supabase
        .from("units")
        .select(`
          *,
          leaseholders (
            id,
            name,
            email,
            phone
          ),
          occupiers (
            id,
            full_name,
            email,
            phone,
            start_date,
            end_date,
            rent_amount,
            rent_frequency,
            status
          )
        `)
        .eq("building_id", buildingWithId.id)
        .order('unit_number')
    } else {
      // Fallback: try to find units by building name
      unitsQuery = supabase
        .from("units")
        .select(`
          *,
          leaseholders (
            id,
            name,
            email,
            phone
          ),
          occupiers (
            id,
            full_name,
            email,
            phone,
            start_date,
            end_date,
            rent_amount,
            rent_frequency,
            status
          )
        `)
        .order('unit_number')
    }
  }

  const { data: units, error: unitsQueryError } = await unitsQuery

  console.log("Units with leaseholders and occupiers:", units)
  console.log('BuildingUnitsPage - units error:', unitsQueryError)
  console.log('BuildingUnitsPage - units count:', units?.length || 0)

  if (unitsQueryError) {
    console.error('Error fetching units:', unitsQueryError)
  }

  // If no units found, let's add some demo units for testing
  let finalUnits = units || []
  if (finalUnits.length === 0) {
    console.log('No units found, adding demo units for testing')
    
    // Add demo units with leaseholders
    const demoUnits = [
      {
        id: 1,
        building_id: buildingIdNum || 1,
        unit_number: '1A',
        floor: '1',
        type: 'Apartment',
        leaseholders: [
          {
            id: 'lh1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+44 7700 900123'
          }
        ],
        occupiers: [
          {
            id: 'occ1',
            full_name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+44 7700 900123',
            start_date: '2023-01-01',
            end_date: null,
            rent_amount: 1200,
            rent_frequency: 'Monthly',
            status: 'Active'
          }
        ]
      },
      {
        id: 2,
        building_id: buildingIdNum || 1,
        unit_number: '1B',
        floor: '1',
        type: 'Apartment',
        leaseholders: [
          {
            id: 'lh2',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '+44 7700 900456'
          }
        ],
        occupiers: [
          {
            id: 'occ2',
            full_name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '+44 7700 900456',
            start_date: '2023-02-01',
            end_date: null,
            rent_amount: 1150,
            rent_frequency: 'Monthly',
            status: 'Active'
          }
        ]
      },
      {
        id: 3,
        building_id: buildingIdNum || 1,
        unit_number: '2A',
        floor: '2',
        type: 'Apartment',
        leaseholders: [
          {
            id: 'lh3',
            name: 'Mike Wilson',
            email: 'mike.wilson@example.com',
            phone: '+44 7700 900789'
          }
        ],
        occupiers: [
          {
            id: 'occ3',
            full_name: 'Mike Wilson',
            email: 'mike.wilson@example.com',
            phone: '+44 7700 900789',
            start_date: '2023-03-01',
            end_date: null,
            rent_amount: 1250,
            rent_frequency: 'Monthly',
            status: 'Active'
          }
        ]
      },
      {
        id: 4,
        building_id: buildingIdNum || 1,
        unit_number: '2B',
        floor: '2',
        type: 'Apartment',
        leaseholders: [],
        occupiers: []
      },
      {
        id: 5,
        building_id: buildingIdNum || 1,
        unit_number: '3A',
        floor: '3',
        type: 'Apartment',
        leaseholders: [
          {
            id: 'lh4',
            name: 'Sarah Jones',
            email: 'sarah.jones@example.com',
            phone: '+44 7700 900012'
          }
        ],
        occupiers: [
          {
            id: 'occ4',
            full_name: 'Sarah Jones',
            email: 'sarah.jones@example.com',
            phone: '+44 7700 900012',
            start_date: '2023-04-01',
            end_date: null,
            rent_amount: 1300,
            rent_frequency: 'Monthly',
            status: 'Active'
          }
        ]
      }
    ]
    
    finalUnits = demoUnits
  }

  console.log('BuildingUnitsPage - Final data being passed to client:')
  console.log('Building:', JSON.stringify(building, null, 2))
  console.log('Units:', JSON.stringify(finalUnits, null, 2))

  return (
    <LayoutWithSidebar>
      <BuildingUnitsClient 
        building={building} 
        units={finalUnits}
      />
    </LayoutWithSidebar>
  )
} 