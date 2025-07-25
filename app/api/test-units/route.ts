import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const buildingId = searchParams.get('buildingId')

  if (!buildingId) {
    return NextResponse.json({ error: 'Building ID is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // First, let's check what buildings exist
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .order('id')

    if (buildingsError) {
      console.error('Buildings query error:', buildingsError)
      return NextResponse.json({ error: buildingsError.message }, { status: 500 })
    }

    // Now let's check what units exist
    const { data: allUnits, error: allUnitsError } = await supabase
      .from('units')
      .select('*')
      .order('building_id')

    if (allUnitsError) {
      console.error('All units query error:', allUnitsError)
      return NextResponse.json({ error: allUnitsError.message }, { status: 500 })
    }

    // Now let's try to get units for the specific building
    const { data: buildingUnits, error: buildingUnitsError } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        floor,
        type,
        leaseholder_id,
        leaseholders (
          id,
          name,
          email
        )
      `)
      .eq('building_id', buildingId)
      .order('unit_number')

    if (buildingUnitsError) {
      console.error('Building units query error:', buildingUnitsError)
      return NextResponse.json({ error: buildingUnitsError.message }, { status: 500 })
    }

    // Let's also check leaseholders
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('*')
      .order('id')

    if (leaseholdersError) {
      console.error('Leaseholders query error:', leaseholdersError)
      return NextResponse.json({ error: leaseholdersError.message }, { status: 500 })
    }

    return NextResponse.json({
      requestedBuildingId: buildingId,
      buildings: buildings,
      allUnits: allUnits,
      buildingUnits: buildingUnits,
      leaseholders: leaseholders,
      summary: {
        totalBuildings: buildings?.length || 0,
        totalUnits: allUnits?.length || 0,
        totalLeaseholders: leaseholders?.length || 0,
        unitsForBuilding: buildingUnits?.length || 0
      }
    })

  } catch (error) {
    console.error('Test units API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 