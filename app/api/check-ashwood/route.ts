import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Test authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔍 Checking Ashwood House data...')

    // Find Ashwood House building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, unit_count, address')
      .eq('name', 'Ashwood House')
      .single()

    if (buildingError || !building) {
      return NextResponse.json({ 
        error: 'Could not find Ashwood House', 
        details: buildingError?.message 
      }, { status: 404 })
    }

    // Count actual units
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number')
      .eq('building_id', building.id)

    if (unitsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch units', 
        details: unitsError.message 
      }, { status: 500 })
    }

    const actualUnitCount = units?.length || 0
    const needsUpdate = building.unit_count !== actualUnitCount

    // Update unit_count if needed
    let updateResult = null
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('buildings')
        .update({ unit_count: actualUnitCount })
        .eq('id', building.id)

      if (updateError) {
        console.error('Failed to update unit count:', updateError)
        updateResult = { error: updateError.message }
      } else {
        updateResult = { success: true, updated: true }
      }
    }

    return NextResponse.json({
      success: true,
      building: {
        id: building.id,
        name: building.name,
        address: building.address,
        unit_count: building.unit_count,
        actual_units: actualUnitCount,
        needs_update: needsUpdate
      },
      units: units || [],
      update_result: updateResult
    })

  } catch (error) {
    console.error('❌ Check Ashwood error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 