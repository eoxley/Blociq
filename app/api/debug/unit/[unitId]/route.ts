import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { unitId: string } }
) {
  try {
    const supabase = createClient(cookies())
    const { unitId } = params

    console.log('🔍 Debug API - Checking unit:', unitId)

    // Check if unit exists
    const { data: unit, error } = await supabase
      .from('units')
      .select('id, unit_number, building_id')
      .eq('id', unitId)
      .single()

    if (error) {
      console.error('❌ Unit not found:', error)
      return NextResponse.json({
        exists: false,
        error: error.message,
        code: error.code
      }, { status: 404 })
    }

    console.log('✅ Unit found:', unit)

    return NextResponse.json({
      exists: true,
      unit: {
        id: unit.id,
        unit_number: unit.unit_number,
        building_id: unit.building_id
      }
    })

  } catch (error) {
    console.error('❌ Debug API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 