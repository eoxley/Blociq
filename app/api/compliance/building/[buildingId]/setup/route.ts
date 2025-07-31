import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    const { buildingId } = await params
    const body = await request.json()
    const { assetIds } = body

    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate building exists
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      )
    }

    // Validate asset IDs exist
    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: 'Asset IDs are required' },
        { status: 400 }
      )
    }

    // Check if assets exist
    const { data: assets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('id')
      .in('id', assetIds)

    if (assetsError) {
      return NextResponse.json(
        { error: 'Failed to validate assets' },
        { status: 500 }
      )
    }

    if (assets.length !== assetIds.length) {
      return NextResponse.json(
        { error: 'Some assets not found' },
        { status: 400 }
      )
    }

    // Create building compliance assets
    const buildingAssets = assetIds.map(assetId => ({
      building_id: buildingId,
      compliance_asset_id: assetId,
      status: 'pending',
      priority: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('building_compliance_assets')
      .insert(buildingAssets)
      .select()

    if (error) {
      console.error('Error creating building compliance assets:', error)
      return NextResponse.json(
        { error: 'Failed to create compliance assets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('Error in compliance setup API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 