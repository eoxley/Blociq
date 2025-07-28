import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Test basic building query
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .limit(5)

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError)
      return NextResponse.json({ 
        error: buildingsError.message,
        code: buildingsError.code 
      }, { status: 500 })
    }

    // Test specific building query
    const testBuildingId = '2beeec1d-a94e-4058-b881-213d74cc6830'
    const { data: testBuilding, error: testBuildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', testBuildingId)
      .maybeSingle()

    if (testBuildingError) {
      console.error('Error fetching test building:', testBuildingError)
      return NextResponse.json({ 
        error: testBuildingError.message,
        code: testBuildingError.code 
      }, { status: 500 })
    }

    // Test units query
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')
      .eq('building_id', testBuildingId)

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
      return NextResponse.json({ 
        error: unitsError.message,
        code: unitsError.code 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      totalBuildings: buildings?.length || 0,
      testBuilding: testBuilding,
      testBuildingExists: !!testBuilding,
      unitsForTestBuilding: units?.length || 0,
      sampleBuildings: buildings?.slice(0, 3)
    })

  } catch (error) {
    console.error('Error in test building API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 