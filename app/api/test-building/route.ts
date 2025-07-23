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

    console.log('🔍 Testing building ID:', buildingId)

    // Test building query
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (buildingError) {
      return NextResponse.json({ 
        error: 'Building query failed', 
        details: buildingError,
        buildingId: buildingId
      }, { status: 500 })
    }

    if (!building) {
      return NextResponse.json({ 
        error: 'Building not found',
        buildingId: buildingId
      }, { status: 404 })
    }

    // Test basic queries
    const { data: units } = await supabase
      .from('units')
      .select('count')
      .eq('building_id', buildingId)

    const { data: complianceAssets } = await supabase
      .from('building_compliance_assets')
      .select('count')
      .eq('building_id', buildingId)

    const { data: emails } = await supabase
      .from('incoming_emails')
      .select('count')
      .eq('building_id', buildingId)

    return NextResponse.json({
      success: true,
      building,
      counts: {
        units: units?.length || 0,
        complianceAssets: complianceAssets?.length || 0,
        emails: emails?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ Test building error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 