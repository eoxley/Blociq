import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const buildingId = searchParams.get('buildingId')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    console.log('=== TEST UNITS API DEBUG ===')
    console.log('Building ID:', buildingId)
    console.log('Building ID type:', typeof buildingId)

    // First, let's check what buildings exist
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name')
      .limit(5)

    console.log('Buildings:', buildings)
    console.log('Buildings error:', buildingsError)

    // Check what units exist
    const { data: allUnits, error: allUnitsError } = await supabase
      .from('units')
      .select('id, building_id, unit_number')
      .limit(10)

    console.log('All units:', allUnits)
    console.log('All units error:', allUnitsError)

    // If buildingId provided, try to fetch units for that building
    let buildingUnits = null
    let buildingUnitsError = null
    
    if (buildingId) {
      const { data, error } = await supabase
        .from('units')
        .select('id, building_id, unit_number, floor, type')
        .eq('building_id', buildingId)
        .order('unit_number')
      
      buildingUnits = data
      buildingUnitsError = error
      
      console.log('Building units:', buildingUnits)
      console.log('Building units error:', buildingUnitsError)
    }

    return NextResponse.json({
      success: true,
      buildingId,
      buildingIdType: typeof buildingId,
      buildings: buildings || [],
      allUnits: allUnits || [],
      buildingUnits: buildingUnits || [],
      errors: {
        buildings: buildingsError,
        allUnits: allUnitsError,
        buildingUnits: buildingUnitsError
      }
    })

  } catch (error) {
    console.error('Error in test units API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 