import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { dummyBuildings } from '@/lib/dummyBuildings'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Fetch all buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .order('name')

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError)
      return NextResponse.json({ error: buildingsError.message }, { status: 500 })
    }

    // If no buildings found in database, use dummy data
    if (!buildings || buildings.length === 0) {
      console.log('No buildings found in database, using dummy data')
      
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

    // Fetch all units to get unit counts
    const { data: allUnits, error: unitsError } = await supabase
      .from('units')
      .select('id, building_id')
      .order('building_id')

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
      return NextResponse.json({ error: unitsError.message }, { status: 500 })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 