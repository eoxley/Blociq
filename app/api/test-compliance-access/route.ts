import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')
    
    if (!buildingId) {
      return NextResponse.json({ error: 'buildingId parameter required' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Test authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      return NextResponse.json({ 
        error: 'Authentication error', 
        details: authError.message 
      }, { status: 401 })
    }

    if (!session) {
      return NextResponse.json({ 
        error: 'No session found' 
      }, { status: 401 })
    }

    console.log('✅ User authenticated:', session.user.id)

    // Test building access
    let building = null
    let buildingError = null
    
    try {
      // Buildings table uses UUID as primary key
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, address, unit_count')
        .eq('id', buildingId)
        .maybeSingle()
      
      building = data
      buildingError = error
    } catch (error) {
      buildingError = error instanceof Error ? error : new Error('Unknown error')
    }

    if (buildingError) {
      return NextResponse.json({ 
        error: 'Building fetch error', 
        details: buildingError.message 
      }, { status: 500 })
    }

    if (!building) {
      return NextResponse.json({ 
        error: 'Building not found' 
      }, { status: 404 })
    }

    // Test compliance assets access
    let complianceAssets = null
    let complianceError = null
    
    try {
      const { data, error } = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          compliance_assets (
            name,
            category,
            description
          )
        `)
        .eq('building_id', building.id)
        .eq('status', 'active')
      
      complianceAssets = data
      complianceError = error
    } catch (error) {
      complianceError = error instanceof Error ? error : new Error('Unknown error')
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email
      },
      building: {
        id: building.id,
        name: building.name,
        address: building.address,
        unit_count: building.unit_count
      },
      complianceAssets: {
        data: complianceAssets,
        error: complianceError?.message,
        count: complianceAssets?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ Test compliance access error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 