import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const {
      buildingId,
      complianceAssetId,
      documentJobId,
      deleteType = 'full' // 'full' | 'analysis_only' | 'actions_only'
    } = body

    if (!buildingId) {
      return NextResponse.json({
        error: 'Missing required field: buildingId'
      }, { status: 400 })
    }

    console.log('🗑️ Starting compliance analysis deletion:', {
      buildingId,
      complianceAssetId,
      documentJobId,
      deleteType,
      userId: user.id
    })

    // Verify user has access to this building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      return NextResponse.json({
        error: 'Building not found or access denied'
      }, { status: 404 })
    }

    const deletedItems = {
      compliance_logs: 0,
      compliance_documents: 0,
      action_items: 0,
      compliance_assets: 0
    }

    // 1. Delete related action items from building_action_tracker
    if (deleteType === 'full' || deleteType === 'actions_only') {
      let actionQuery = supabase
        .from('building_action_tracker')
        .delete()
        .eq('building_id', buildingId)

      // If we have specific identifiers, use them to target specific actions
      if (documentJobId) {
        actionQuery = actionQuery.like('notes', `%${documentJobId}%`)
      } else if (complianceAssetId) {
        actionQuery = actionQuery.like('notes', '%Compliance Analysis%')
      }

      const { data: deletedActions, error: actionError } = await actionQuery.select()

      if (actionError) {
        console.warn('⚠️ Error deleting action items:', actionError)
      } else {
        deletedItems.action_items = deletedActions?.length || 0
        console.log(`✅ Deleted ${deletedItems.action_items} action items`)
      }
    }

    // 2. Delete compliance logs
    if (deleteType === 'full' || deleteType === 'analysis_only') {
      if (complianceAssetId) {
        const { data: deletedLogs, error: logError } = await supabase
          .from('compliance_logs')
          .delete()
          .eq('building_compliance_asset_id', complianceAssetId)
          .select()

        if (logError) {
          console.warn('⚠️ Error deleting compliance logs:', logError)
        } else {
          deletedItems.compliance_logs = deletedLogs?.length || 0
          console.log(`✅ Deleted ${deletedItems.compliance_logs} compliance logs`)
        }
      }
    }

    // 3. Delete compliance documents
    if (deleteType === 'full' || deleteType === 'analysis_only') {
      if (complianceAssetId) {
        const { data: deletedDocs, error: docError } = await supabase
          .from('compliance_documents')
          .delete()
          .eq('building_id', buildingId)
          .eq('compliance_asset_id', complianceAssetId)
          .select()

        if (docError) {
          console.warn('⚠️ Error deleting compliance documents:', docError)
        } else {
          deletedItems.compliance_documents = deletedDocs?.length || 0
          console.log(`✅ Deleted ${deletedItems.compliance_documents} compliance documents`)
        }
      }
    }

    // 4. Reset or delete the building compliance asset
    if (deleteType === 'full' && complianceAssetId) {
      // Option 1: Reset the asset to 'not_applied' status
      const { error: resetError } = await supabase
        .from('building_compliance_assets')
        .update({
          status: 'not_applied',
          notes: 'Analysis deleted - requires new assessment',
          last_renewed_date: null,
          latest_document_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', complianceAssetId)

      if (resetError) {
        console.warn('⚠️ Error resetting compliance asset:', resetError)
      } else {
        console.log('✅ Reset compliance asset to not_applied status')
      }

      // Option 2: Completely delete the asset (uncomment if preferred)
      /*
      const { data: deletedAssets, error: assetError } = await supabase
        .from('building_compliance_assets')
        .delete()
        .eq('id', complianceAssetId)
        .select()

      if (assetError) {
        console.warn('⚠️ Error deleting compliance asset:', assetError)
      } else {
        deletedItems.compliance_assets = deletedAssets?.length || 0
        console.log(`✅ Deleted ${deletedItems.compliance_assets} compliance assets`)
      }
      */
    }

    // 5. Delete document jobs if specified (external system)
    if (deleteType === 'full' && documentJobId) {
      try {
        const { error: jobError } = await supabase
          .from('document_jobs')
          .delete()
          .eq('id', documentJobId)

        if (jobError) {
          console.warn('⚠️ Error deleting document job:', jobError)
        } else {
          console.log('✅ Deleted document job')
        }
      } catch (err) {
        console.warn('⚠️ Document jobs table may not exist:', err)
      }
    }

    const totalDeleted = Object.values(deletedItems).reduce((sum, count) => sum + count, 0)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted compliance analysis. Removed ${totalDeleted} items.`,
      deleted_items: deletedItems,
      delete_type: deleteType,
      building_id: buildingId,
      compliance_asset_id: complianceAssetId
    })

  } catch (error) {
    console.error('❌ Error deleting compliance analysis:', error)
    return NextResponse.json({
      error: 'Failed to delete compliance analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Support both DELETE and POST methods for flexibility
  return DELETE(request)
}