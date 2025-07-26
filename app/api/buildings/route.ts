import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
        liveUnitCount: liveUnitCount
      }
    }) || []

    return NextResponse.json({ 
      buildings: buildingsWithUnitCounts,
      totalBuildings: buildingsWithUnitCounts.length,
      totalUnits: allUnits?.length || 0
    })

  } catch (error) {
    console.error('Error in buildings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 