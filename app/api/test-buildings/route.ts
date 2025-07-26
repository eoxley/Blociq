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

    // Fetch all units
    const { data: allUnits, error: unitsError } = await supabase
      .from('units')
      .select('id, building_id, unit_number')
      .order('building_id')

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
      return NextResponse.json({ error: unitsError.message }, { status: 500 })
    }

    // Group units by building_id
    const unitsByBuilding = new Map<string, any[]>()
    allUnits?.forEach(unit => {
      const buildingId = unit.building_id
      if (!unitsByBuilding.has(buildingId)) {
        unitsByBuilding.set(buildingId, [])
      }
      unitsByBuilding.get(buildingId)!.push(unit)
    })

    // Map buildings with their unit counts
    const buildingsWithUnits = buildings?.map(building => ({
      ...building,
      unitCount: unitsByBuilding.get(building.id)?.length || 0,
      units: unitsByBuilding.get(building.id) || []
    })) || []

    return NextResponse.json({
      buildings: buildingsWithUnits,
      summary: {
        totalBuildings: buildings?.length || 0,
        totalUnits: allUnits?.length || 0,
        buildingsWithUnits: buildingsWithUnits.filter(b => b.unitCount > 0).length,
        buildingsWithoutUnits: buildingsWithUnits.filter(b => b.unitCount === 0).length
      }
    })

  } catch (error) {
    console.error('Error in test buildings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 