import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check if Supabase environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Supabase environment variables not found')
      return NextResponse.json({ 
        buildings: [],
        totalBuildings: 0,
        totalUnits: 0,
        isDummyData: false,
        error: 'Supabase not configured'
      })
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
      return NextResponse.json({ 
        buildings: [],
        totalBuildings: 0,
        totalUnits: 0,
        isDummyData: false,
        error: 'Failed to fetch buildings'
      })
    }

    // If no buildings found in database, return empty array
    if (!buildings || buildings.length === 0) {
      console.log('No buildings found in database')
      return NextResponse.json({ 
        buildings: [],
        totalBuildings: 0,
        totalUnits: 0,
        isDummyData: false
      })
    }

    // Fetch all units to get unit counts
    const { data: allUnits, error: unitsError } = await supabase
      .from('units')
      .select('id, building_id')
      .order('building_id')

    if (unitsError) {
      console.error('Error fetching units from Supabase:', unitsError)
      return NextResponse.json({ 
        buildings: buildings || [],
        totalBuildings: buildings?.length || 0,
        totalUnits: 0,
        isDummyData: false,
        error: 'Failed to fetch unit counts'
      })
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
    return NextResponse.json({ 
      buildings: [],
      totalBuildings: 0,
      totalUnits: 0,
      isDummyData: false,
      error: 'Internal server error'
    })
  }
} 