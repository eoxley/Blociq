import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Test 1: Check if buildings table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'buildings' })
      .catch(() => ({ data: null, error: 'RPC not available' }))

    // Test 2: Try to select from buildings table
    const { data: buildings, error: selectError } = await supabase
      .from('buildings')
      .select('id, name, notes, key_access_notes, entry_code, fire_panel_location, updated_at')
      .limit(1)

    // Test 3: Check if we can update a building
    let updateTest = null
    let updateError = null
    
    if (buildings && buildings.length > 0) {
      const testBuilding = buildings[0]
      const { data: updateResult, error: updateErr } = await supabase
        .from('buildings')
        .update({ 
          notes: testBuilding.notes || 'Test update',
          updated_at: new Date().toISOString()
        })
        .eq('id', testBuilding.id)
        .select('id, notes, updated_at')
        .single()
      
      updateTest = updateResult
      updateError = updateErr
    }

    return NextResponse.json({
      success: true,
      tests: {
        tableInfo: tableError ? 'RPC not available' : tableInfo,
        selectTest: {
          success: !selectError,
          error: selectError?.message,
          data: buildings
        },
        updateTest: {
          success: !updateError,
          error: updateError?.message,
          data: updateTest
        }
      }
    })

  } catch (error) {
    console.error('Error in test-building-schema API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 