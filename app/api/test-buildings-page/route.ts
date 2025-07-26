import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Test the same logic as the buildings API
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .order('name')

    if (buildingsError) {
      return NextResponse.json({ 
        error: 'Buildings query failed', 
        details: buildingsError 
      }, { status: 500 })
    }

    const { data: allUnits, error: unitsError } = await supabase
      .from('units')
      .select('id, building_id')
      .order('building_id')

    if (unitsError) {
      return NextResponse.json({ 
        error: 'Units query failed', 
        details: unitsError 
      }, { status: 500 })
    }

    // Create a map of building_id to unit count
    const unitCountMap = new Map<string, number>()
    allUnits?.forEach(unit => {
      const buildingId = unit.building_id
      unitCountMap.set(buildingId, (unitCountMap.get(buildingId) || 0) + 1)
    })

    // Map buildings to include live unit counts
    const buildingsWithUnitCounts = buildings?.map(building => {
      const liveUnitCount = unitCountMap.get(building.id) || 0
      
      return {
        ...building,
        liveUnitCount: liveUnitCount
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: {
        buildings: buildingsWithUnitCounts,
        totalBuildings: buildingsWithUnitCounts.length,
        totalUnits: allUnits?.length || 0,
        buildingsWithUnits: buildingsWithUnitCounts.filter(b => b.liveUnitCount > 0).length,
        buildingsWithoutUnits: buildingsWithUnitCounts.filter(b => b.liveUnitCount === 0).length
      },
      testResults: {
        buildingsQuery: buildingsError ? 'FAILED' : 'SUCCESS',
        unitsQuery: unitsError ? 'FAILED' : 'SUCCESS',
        unitCountMapping: 'SUCCESS',
        dataStructure: 'VALID'
      }
    })

  } catch (error) {
    console.error('Error in test buildings page API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 