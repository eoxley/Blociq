import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const buildingId = searchParams.get('buildingId')

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('building_assets')
      .select(`
        *,
        compliance_items (
          id,
          item_type,
          category,
          frequency
        )
      `)
      .eq('building_id', parseInt(buildingId))

    if (error) {
      console.error('Error fetching building assets:', error)
      return NextResponse.json({ error: 'Failed to fetch building assets', assets: [] }, { status: 500 })
    }

    return NextResponse.json({ assets: data || [] })
  } catch (error) {
    console.error('Error in building assets GET:', error)
    return NextResponse.json({ error: 'Internal server error', assets: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { buildingId, assets, applyToAll } = body

    if (!buildingId || !assets) {
      return NextResponse.json({ error: 'Building ID and assets are required' }, { status: 400 })
    }

    // Upsert assets for the specified building
    const { error: upsertError } = await supabase
      .from('building_assets')
      .upsert(assets, { onConflict: 'building_id,compliance_item_id' })

    if (upsertError) {
      console.error('Error upserting building assets:', upsertError)
      return NextResponse.json({ error: 'Failed to save building assets' }, { status: 500 })
    }

    // If applyToAll is true, apply to other buildings
    if (applyToAll) {
      const { data: allBuildings } = await supabase
        .from('buildings')
        .select('id')
        .neq('id', buildingId)

      if (allBuildings && allBuildings.length > 0) {
        const otherBuildingAssets = allBuildings.flatMap(building => 
          assets.map((asset: any) => ({
            ...asset,
            id: 0,
            building_id: building.id,
            created_at: null,
            updated_at: null
          }))
        )

        const { error: bulkUpsertError } = await supabase
          .from('building_assets')
          .upsert(otherBuildingAssets, { onConflict: 'building_id,compliance_item_id' })

        if (bulkUpsertError) {
          console.error('Error applying to all buildings:', bulkUpsertError)
          // Don't fail the request, just log the error
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Building assets saved successfully',
      appliedToAll: applyToAll 
    })
  } catch (error) {
    console.error('Error in building assets POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { buildingId, complianceItemId, updates } = body

    if (!buildingId || !complianceItemId || !updates) {
      return NextResponse.json({ error: 'Building ID, compliance item ID, and updates are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('building_assets')
      .update(updates)
      .eq('building_id', buildingId)
      .eq('compliance_item_id', complianceItemId)

    if (error) {
      console.error('Error updating building asset:', error)
      return NextResponse.json({ error: 'Failed to update building asset' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Building asset updated successfully' })
  } catch (error) {
    console.error('Error in building assets PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 