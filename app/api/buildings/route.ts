import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { dummyBuildings } from '@/lib/dummyBuildings'

export async function GET() {
  try {
    // Check if Supabase environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Supabase environment variables not found, using dummy data')
      return getDummyBuildingsResponse()
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch all buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .order('name')

    if (buildingsError) {
      console.error('Error fetching buildings from Supabase:', buildingsError)
      console.log('Falling back to dummy data due to Supabase error')
      return getDummyBuildingsResponse()
    }

    // If no buildings found in database, use dummy data
    if (!buildings || buildings.length === 0) {
      console.log('No buildings found in database, using dummy data')
      return getDummyBuildingsResponse()
    }

    // Fetch all units to get unit counts
    const { data: allUnits, error: unitsError } = await supabase
      .from('units')
      .select('id, building_id')
      .order('building_id')

    if (unitsError) {
      console.error('Error fetching units from Supabase:', unitsError)
      console.log('Falling back to dummy data due to units error')
      return getDummyBuildingsResponse()
    }

    // Create a map of building_id to unit count
    const unitCountMap = new Map<string, number>()
    allUnits?.forEach(unit => {
      const buildingId = unit.building_id
      unitCountMap.set(buildingId, (unitCountMap.get(buildingId) || 0) + 1)
    })

    // Map buildings to include live unit counts
    const buildingsWithUnitCounts = buildings?.map(building => {
      // Get the live unit count from the units table
      const liveUnitCount = unitCountMap.get(building.id) || 0
      
      console.log(`Building: ${building.name} (${building.id}) - Live units: ${liveUnitCount}`)
      
      return {
        ...building,
        liveUnitCount: liveUnitCount,
        isDummy: false // Flag to identify real data
      }
    }) || []

    return NextResponse.json({ 
      buildings: buildingsWithUnitCounts,
      totalBuildings: buildingsWithUnitCounts.length,
      totalUnits: allUnits?.length || 0,
      isDummyData: false
    })

  } catch (error) {
    console.error('Error in buildings API:', error)
    console.log('Falling back to dummy data due to unexpected error')
    return getDummyBuildingsResponse()
  }
}

// Helper function to return dummy buildings response
function getDummyBuildingsResponse() {
  const dummyBuildingsWithIds = dummyBuildings.map((building, index) => ({
    id: `dummy-${index + 1}`,
    name: building.name,
    address: building.address,
    unit_count: building.units,
    liveUnitCount: building.units,
    postcode: building.postcode,
    image: building.image,
    isDummy: true, // Flag to identify dummy data
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))

  return NextResponse.json({ 
    buildings: dummyBuildingsWithIds,
    totalBuildings: dummyBuildingsWithIds.length,
    totalUnits: dummyBuildings.reduce((total, building) => total + building.units, 0),
    isDummyData: true
  })
} 