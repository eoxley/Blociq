import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(cookies())

  try {
    console.log('🔍 Testing building_setup table structure...')

    // Test 1: Check if building_setup table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'building_setup')

    console.log('✅ Table exists check:', { tableExists, error: tableError })

    // Test 2: Get all columns in building_setup table
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'building_setup')
      .order('ordinal_position')

    console.log('✅ Building setup columns:', columns)

    // Test 3: Try to query building_setup table
    const { data: setupData, error: setupError } = await supabase
      .from('building_setup')
      .select('*')
      .limit(1)

    console.log('✅ Building setup query:', { setupData, error: setupError })

    // Test 4: Try to query buildings with building_setup join
    const { data: buildingWithSetup, error: buildingSetupError } = await supabase
      .from('buildings')
      .select(`
        *,
        building_setup (
          structure_type,
          operational_notes,
          client_type,
          client_name,
          client_contact,
          client_email
        )
      `)
      .limit(1)

    console.log('✅ Building with setup query:', { buildingWithSetup, error: buildingSetupError })

    // Test 5: Check if assigned_manager column exists
    const { data: assignedManagerColumn, error: assignedManagerError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'building_setup')
      .eq('column_name', 'assigned_manager')

    console.log('✅ Assigned manager column check:', { assignedManagerColumn, error: assignedManagerError })

    return NextResponse.json({
      success: true,
      tests: {
        tableExists: { data: tableExists, error: tableError },
        columns: { data: columns, error: columnsError },
        setupQuery: { data: setupData, error: setupError },
        buildingWithSetup: { data: buildingWithSetup, error: buildingSetupError },
        assignedManagerColumn: { data: assignedManagerColumn, error: assignedManagerError }
      }
    })

  } catch (error) {
    console.error('❌ Test building setup error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 