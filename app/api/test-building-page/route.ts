import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')
    
    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID required' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Test authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔍 Testing building page queries for ID:', buildingId)

    // Test building query
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (buildingError) {
      return NextResponse.json({ 
        error: 'Building query failed', 
        details: buildingError 
      }, { status: 500 })
    }

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }

    // Test building_setup query
    const { data: buildingSetup, error: setupError } = await supabase
      .from('building_setup')
      .select('*')
      .eq('building_id', buildingId)
      .single()

    // Test compliance assets query
    const { data: complianceAssets, error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (
          name,
          category
        )
      `)
      .eq('building_id', buildingId)

    // Test units query
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select(`
        *,
        leaseholders (
          id,
          name,
          email,
          phone
        ),
        leases (
          id,
          start_date,
          expiry_date,
          doc_type,
          is_headlease
        )
      `)
      .eq('building_id', buildingId)
      .order('unit_number')

    // Test other queries
    const { data: recentEmails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('building_id', buildingId)
      .order('received_at', { ascending: false })
      .limit(5)

    const { data: complianceDocs, error: complianceDocsError } = await supabase
      .from('compliance_docs')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: buildingDocs, error: buildingDocsError } = await supabase
      .from('building_documents')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: events, error: eventsError } = await supabase
      .from('property_events')
      .select('*')
      .eq('building_id', buildingId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5)

    const { data: todos, error: todosError } = await supabase
      .from('building_todos')
      .select('*')
      .eq('building_id', buildingId)
      .order('due_date', { ascending: true })
      .limit(10)

    return NextResponse.json({
      success: true,
      building,
      errors: {
        buildingSetup: setupError,
        complianceAssets: complianceError,
        units: unitsError,
        recentEmails: emailsError,
        complianceDocs: complianceDocsError,
        buildingDocs: buildingDocsError,
        events: eventsError,
        todos: todosError
      },
      data: {
        buildingSetup: buildingSetup || null,
        complianceAssets: complianceAssets || [],
        units: units || [],
        recentEmails: recentEmails || [],
        complianceDocs: complianceDocs || [],
        buildingDocs: buildingDocs || [],
        events: events || [],
        todos: todos || []
      }
    })

  } catch (error) {
    console.error('❌ Test building page error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 