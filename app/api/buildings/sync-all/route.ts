import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncBuildingFromAllSources } from '@/lib/unified-building-sync'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { buildingId } = await request.json()

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 })
    }

    // Run unified synchronization
    const result = await syncBuildingFromAllSources(supabase, buildingId)

    return NextResponse.json({
      success: true,
      message: result.summary,
      details: {
        buildingUpdated: result.buildingUpdated,
        updatedFields: result.updatedFields,
        skippedFields: result.skippedFields,
        complianceActionsCreated: result.complianceActionsCreated,
        majorWorksActionsCreated: result.majorWorksActionsCreated,
        leaseDataSynced: result.leaseDataSynced,
        totalActionsCreated: result.complianceActionsCreated + result.majorWorksActionsCreated,
        errors: result.errors
      }
    })

  } catch (error) {
    console.error('Error in unified sync:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Sync all buildings (for admin/maintenance use)
 */
export async function PUT(request: NextRequest) {
  try {
    // Get all buildings
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name')

    if (error || !buildings) {
      return NextResponse.json({ error: 'Failed to fetch buildings' }, { status: 500 })
    }

    const results = []
    let totalActionsCreated = 0
    let totalBuildingsUpdated = 0

    // Sync each building
    for (const building of buildings) {
      try {
        const result = await syncBuildingFromAllSources(supabase, building.id)
        results.push({
          buildingId: building.id,
          buildingName: building.name,
          summary: result.summary,
          actionsCreated: result.complianceActionsCreated + result.majorWorksActionsCreated,
          updated: result.buildingUpdated
        })

        totalActionsCreated += result.complianceActionsCreated + result.majorWorksActionsCreated
        if (result.buildingUpdated) totalBuildingsUpdated++

      } catch (error) {
        results.push({
          buildingId: building.id,
          buildingName: building.name,
          error: `Sync failed: ${error}`
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${buildings.length} buildings: ${totalBuildingsUpdated} updated, ${totalActionsCreated} actions created`,
      results
    })

  } catch (error) {
    console.error('Error in bulk sync:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}