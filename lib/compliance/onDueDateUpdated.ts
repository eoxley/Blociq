import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createOrUpdateComplianceReminder } from '@/lib/outlook/createComplianceReminder'

interface OnDueDateUpdatedInput {
  buildingId: string
  complianceAssetId: string
  nextDueDate: string // ISO format (YYYY-MM-DD)
  outlookAccessToken: string
}

interface OnDueDateUpdatedResult {
  success: boolean
  eventId?: string
  action?: 'created' | 'updated'
  error?: string
}

/**
 * Triggers Outlook calendar integration when a compliance asset's due date is updated.
 * Fetches building and asset metadata, then creates or updates a calendar reminder.
 */
export async function onDueDateUpdated(
  input: OnDueDateUpdatedInput
): Promise<OnDueDateUpdatedResult> {
  const supabase = createClientComponentClient()

  try {
    // Validate inputs
    const validation = validateOnDueDateUpdatedInput(input)
    if (!validation.isValid) {
      return {
        success: false,
        error: `Invalid input: ${validation.errors.join(', ')}`
      }
    }

    // Don't proceed if nextDueDate is missing
    if (!input.nextDueDate || input.nextDueDate.trim().length === 0) {
      console.log('⚠️ Skipping calendar reminder - no due date provided')
      return {
        success: false,
        error: 'No due date provided'
      }
    }

    console.log('📅 Processing due date update for compliance asset:', {
      buildingId: input.buildingId,
      complianceAssetId: input.complianceAssetId,
      nextDueDate: input.nextDueDate
    })

    // Step 1: Fetch building metadata
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', input.buildingId)
      .single()

    if (buildingError || !building) {
      console.error('❌ Failed to fetch building data:', buildingError)
      return {
        success: false,
        error: `Failed to fetch building data: ${buildingError?.message || 'Building not found'}`
      }
    }

    // Step 2: Fetch compliance asset metadata
    const { data: complianceAsset, error: assetError } = await supabase
      .from('compliance_assets')
      .select('name, category')
      .eq('id', input.complianceAssetId)
      .single()

    if (assetError || !complianceAsset) {
      console.error('❌ Failed to fetch compliance asset data:', assetError)
      return {
        success: false,
        error: `Failed to fetch compliance asset data: ${assetError?.message || 'Asset not found'}`
      }
    }

    console.log('📋 Fetched metadata:', {
      buildingName: building.name,
      assetName: complianceAsset.name,
      category: complianceAsset.category
    })

    // Step 3: Create or update Outlook calendar reminder
    const reminderResult = await createOrUpdateComplianceReminder({
      buildingName: building.name,
      assetName: complianceAsset.name,
      nextDueDate: input.nextDueDate,
      outlookAccessToken: input.outlookAccessToken
    })

    console.log('✅ Calendar reminder processed:', {
      eventId: reminderResult.eventId,
      action: reminderResult.action,
      buildingName: building.name,
      assetName: complianceAsset.name,
      dueDate: input.nextDueDate
    })

    // Step 4: Store event ID in building_compliance_assets (Optional Phase 2)
    try {
      const { error: updateError } = await supabase
        .from('building_compliance_assets')
        .update({
          event_id: reminderResult.eventId,
          last_updated: new Date().toISOString(),
          notes: `Calendar reminder ${reminderResult.action} on ${new Date().toLocaleDateString('en-GB')}`
        })
        .eq('building_id', input.buildingId)
        .eq('asset_id', input.complianceAssetId)

      if (updateError) {
        console.warn('⚠️ Failed to store event ID in database:', updateError)
        // Don't fail the whole operation if this step fails
      } else {
        console.log('💾 Event ID stored in database:', reminderResult.eventId)
      }
    } catch (dbError) {
      console.warn('⚠️ Error storing event ID in database:', dbError)
      // Don't fail the whole operation if this step fails
    }

    return {
      success: true,
      eventId: reminderResult.eventId,
      action: reminderResult.action
    }

  } catch (error) {
    console.error('❌ Error in onDueDateUpdated:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Validates the input parameters for the onDueDateUpdated function
 */
function validateOnDueDateUpdatedInput(
  input: OnDueDateUpdatedInput
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate building ID
  if (!input.buildingId || input.buildingId.trim().length === 0) {
    errors.push('Building ID is required')
  }

  // Validate compliance asset ID
  if (!input.complianceAssetId || input.complianceAssetId.trim().length === 0) {
    errors.push('Compliance asset ID is required')
  }

  // Validate next due date (optional but if provided, must be valid)
  if (input.nextDueDate && input.nextDueDate.trim().length > 0) {
    const dueDate = new Date(input.nextDueDate)
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid next due date format (must be ISO format YYYY-MM-DD)')
    } else if (dueDate < new Date()) {
      errors.push('Next due date cannot be in the past')
    }
  }

  // Validate Outlook access token
  if (!input.outlookAccessToken || input.outlookAccessToken.trim().length === 0) {
    errors.push('Outlook access token is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Helper function to remove calendar reminder when compliance asset is deactivated
 */
export async function removeComplianceReminder(
  buildingId: string,
  complianceAssetId: string,
  outlookAccessToken: string
): Promise<OnDueDateUpdatedResult> {
  const supabase = createClientComponentClient()

  try {
    console.log('🗑️ Removing compliance reminder for:', {
      buildingId,
      complianceAssetId
    })

    // Get the stored event ID
    const { data: buildingAsset, error: fetchError } = await supabase
      .from('building_compliance_assets')
      .select('event_id')
      .eq('building_id', buildingId)
      .eq('asset_id', complianceAssetId)
      .single()

    if (fetchError || !buildingAsset?.event_id) {
      console.log('ℹ️ No event ID found for removal')
      return {
        success: true,
        error: 'No event ID found to remove'
      }
    }

    // Import the delete function
    const { deleteComplianceReminder } = await import('@/lib/outlook/createComplianceReminder')
    
    // Delete the calendar event
    const deleted = await deleteComplianceReminder(buildingAsset.event_id, outlookAccessToken)

    if (deleted) {
      // Clear the event ID from database
      await supabase
        .from('building_compliance_assets')
        .update({
          event_id: null,
          last_updated: new Date().toISOString(),
          notes: `Calendar reminder removed on ${new Date().toLocaleDateString('en-GB')}`
        })
        .eq('building_id', buildingId)
        .eq('asset_id', complianceAssetId)

      console.log('✅ Compliance reminder removed successfully')
      return {
        success: true
      }
    } else {
      return {
        success: false,
        error: 'Failed to delete calendar event'
      }
    }

  } catch (error) {
    console.error('❌ Error removing compliance reminder:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Helper function to get compliance reminder status
 */
export async function getComplianceReminderStatus(
  buildingId: string,
  complianceAssetId: string
): Promise<{ hasReminder: boolean; eventId?: string; lastUpdated?: string }> {
  const supabase = createClientComponentClient()

  try {
    const { data: buildingAsset, error } = await supabase
      .from('building_compliance_assets')
      .select('event_id, last_updated')
      .eq('building_id', buildingId)
      .eq('asset_id', complianceAssetId)
      .single()

    if (error || !buildingAsset) {
      return { hasReminder: false }
    }

    return {
      hasReminder: !!buildingAsset.event_id,
      eventId: buildingAsset.event_id || undefined,
      lastUpdated: buildingAsset.last_updated || undefined
    }

  } catch (error) {
    console.error('❌ Error getting compliance reminder status:', error)
    return { hasReminder: false }
  }
}

/**
 * Helper function to refresh all compliance reminders for a building
 */
export async function refreshBuildingComplianceReminders(
  buildingId: string,
  outlookAccessToken: string
): Promise<{ success: boolean; processed: number; errors: string[] }> {
  const supabase = createClientComponentClient()

  try {
    console.log('🔄 Refreshing all compliance reminders for building:', buildingId)

    // Get all active compliance assets for the building
    const { data: buildingAssets, error } = await supabase
      .from('building_compliance_assets')
      .select(`
        asset_id,
        next_due_date,
        compliance_assets (
          name,
          category
        )
      `)
      .eq('building_id', buildingId)
      .eq('status', 'active')
      .not('next_due_date', 'is', null)

    if (error) {
      console.error('❌ Failed to fetch building compliance assets:', error)
      return {
        success: false,
        processed: 0,
        errors: [`Failed to fetch building compliance assets: ${error.message}`]
      }
    }

    if (!buildingAssets || buildingAssets.length === 0) {
      console.log('ℹ️ No active compliance assets found for building')
      return {
        success: true,
        processed: 0,
        errors: []
      }
    }

    // Get building name
    const { data: building } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', buildingId)
      .single()

    const buildingName = building?.name || 'Unknown Building'

    // Process each compliance asset
    const errors: string[] = []
    let processed = 0

    for (const asset of buildingAssets) {
      try {
        if (asset.next_due_date && asset.compliance_assets?.name) {
          const result = await createOrUpdateComplianceReminder({
            buildingName,
            assetName: asset.compliance_assets.name,
            nextDueDate: asset.next_due_date,
            outlookAccessToken
          })

          // Update the event ID in database
          await supabase
            .from('building_compliance_assets')
            .update({
              event_id: result.eventId,
              last_updated: new Date().toISOString()
            })
            .eq('building_id', buildingId)
            .eq('asset_id', asset.asset_id)

          processed++
          console.log(`✅ Processed reminder for ${asset.compliance_assets.name}: ${result.action}`)
        }
      } catch (assetError) {
        const errorMessage = `Failed to process ${asset.compliance_assets?.name || 'unknown asset'}: ${assetError instanceof Error ? assetError.message : 'Unknown error'}`
        errors.push(errorMessage)
        console.error('❌', errorMessage)
      }
    }

    console.log(`🔄 Refresh completed: ${processed} processed, ${errors.length} errors`)
    return {
      success: errors.length === 0,
      processed,
      errors
    }

  } catch (error) {
    console.error('❌ Error refreshing building compliance reminders:', error)
    return {
      success: false,
      processed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
} 