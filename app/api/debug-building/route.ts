import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const buildingId = searchParams.get('buildingId')

  if (!buildingId) {
    return NextResponse.json({ error: 'Building ID is required' }, { status: 400 })
  }

  const supabase = createClient(cookies())

  try {
    console.log('🔍 Debug: Testing building query for ID:', buildingId)

    // Test 1: Basic building query
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .maybeSingle()

    console.log('✅ Building query result:', { building, error: buildingError })

    // Test 2: Building with setup
    const { data: buildingWithSetup, error: setupError } = await supabase
      .from('buildings')
      .select(`
        *,
        building_setup (
          structure_type,
          operational_notes,
          client_type,
          client_name,
          client_contact,
          client_email,
          assigned_manager
        )
      `)
      .eq('id', buildingId)
      .maybeSingle()

    console.log('✅ Building with setup query result:', { buildingWithSetup, error: setupError })

    // Test 3: Check if building_setup table exists
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'building_setup')

    console.log('✅ Table info:', { tableInfo, error: tableError })

    // Test 4: Check building_setup columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'building_setup')

    console.log('✅ Building setup columns:', { columns, error: columnsError })

    return NextResponse.json({
      success: true,
      buildingId,
      tests: {
        basicBuilding: { data: building, error: buildingError },
        buildingWithSetup: { data: buildingWithSetup, error: setupError },
        tableExists: { data: tableInfo, error: tableError },
        columns: { data: columns, error: columnsError }
      }
    })

  } catch (error) {
    console.error('❌ Debug building error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 