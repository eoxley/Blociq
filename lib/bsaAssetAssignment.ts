import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// BSA-related compliance assets that should be automatically assigned to HRB buildings
const BSA_COMPLIANCE_ASSETS = [
  'Safety Case Report',
  'Safety Case Certificate', 
  'Resident Engagement Strategy',
  'Building Assessment Certificate',
  'Accountable Person ID Check',
  'Mandatory Occurrence Log'
]

export async function assignBSAAssetsToHRB(buildingId: string, userId: string) {
  try {
    console.log(`🏗️ Assigning BSA assets to HRB building ${buildingId}...`)

    // 1. Get the BSA compliance assets from the compliance_assets table
    const { data: bsaAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('id, name, category, frequency, assigned_to, notes')
      .in('name', BSA_COMPLIANCE_ASSETS)

    if (assetsError) {
      console.error('❌ Error fetching BSA assets:', assetsError)
      throw new Error(`Failed to fetch BSA compliance assets: ${assetsError.message}`)
    }

    if (!bsaAssets || bsaAssets.length === 0) {
      console.warn('⚠️ No BSA compliance assets found in database')
      return { success: false, message: 'No BSA compliance assets found' }
    }

    console.log(`✅ Found ${bsaAssets.length} BSA assets to assign`)

    // 2. Get existing building compliance assignments to avoid duplicates
    const { data: existingAssignments, error: existingError } = await supabase
      .from('building_assets')
      .select('compliance_item_id')
      .eq('building_id', parseInt(buildingId))

    if (existingError) {
      console.error('❌ Error fetching existing assignments:', existingError)
      throw new Error(`Failed to fetch existing compliance assignments: ${existingError.message}`)
    }

    const existingAssetIds = new Set(existingAssignments?.map(assignment => assignment.compliance_item_id) || [])

    // 3. Filter out assets that are already assigned
    const assetsToAssign = bsaAssets.filter(asset => !existingAssetIds.has(asset.id))

    if (assetsToAssign.length === 0) {
      console.log('ℹ️ All BSA assets are already assigned to this building')
      return { success: true, message: 'All BSA assets already assigned', assigned: 0 }
    }

    console.log(`📋 Assigning ${assetsToAssign.length} new BSA assets`)

    // 4. Prepare the building_assets records to insert
    const buildingAssetsToInsert = assetsToAssign.map(asset => ({
      building_id: parseInt(buildingId),
      compliance_item_id: asset.id,
      status: 'missing',
      applies: true,
      next_due: null, // Will be calculated based on frequency
      last_checked: null,
      notes: `Automatically assigned for HRB building on ${new Date().toISOString()}`,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // 5. Insert the new building_assets records
    const { data: insertedAssets, error: insertError } = await supabase
      .from('building_assets')
      .insert(buildingAssetsToInsert)
      .select()

    if (insertError) {
      console.error('❌ Error inserting BSA assets:', insertError)
      throw new Error(`Failed to assign BSA assets: ${insertError.message}`)
    }

    console.log(`✅ Successfully assigned ${insertedAssets?.length || 0} BSA assets`)

    // 6. Log the assignment for audit purposes
    const { error: logError } = await supabase
      .from('compliance_logs')
      .insert({
        building_id: parseInt(buildingId),
        action: 'bsa_assets_assigned',
        description: `Automatically assigned ${insertedAssets?.length || 0} BSA compliance assets for HRB building`,
        metadata: {
          assigned_assets: assetsToAssign.map(asset => asset.name),
          assigned_count: insertedAssets?.length || 0,
          assigned_by: userId,
          trigger: 'hrb_marking'
        },
        created_by: userId,
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.warn('⚠️ Could not log BSA assignment:', logError)
    }

    const result = {
      success: true,
      message: `Successfully assigned ${insertedAssets?.length || 0} BSA assets`,
      assigned: insertedAssets?.length || 0,
      assets: insertedAssets,
      assignedAssetNames: assetsToAssign.map(asset => asset.name)
    }

    console.log('🎉 BSA asset assignment completed successfully')
    console.log('📊 Assignment summary:', {
      building_id: buildingId,
      total_bsa_assets: bsaAssets.length,
      newly_assigned: insertedAssets?.length || 0,
      already_assigned: bsaAssets.length - (insertedAssets?.length || 0),
      assigned_assets: assetsToAssign.map(asset => asset.name)
    })

    return result

  } catch (error) {
    console.error('❌ BSA asset assignment failed:', error)
    throw error
  }
}

// Function to check if a building is HRB and assign BSA assets if needed
export async function checkAndAssignBSAAssets(buildingId: string, isHRB: boolean, userId: string) {
  try {
    if (!isHRB) {
      console.log(`ℹ️ Building ${buildingId} is not marked as HRB, skipping BSA asset assignment`)
      return { success: true, message: 'Building not HRB, no BSA assets assigned' }
    }

    console.log(`🔍 Building ${buildingId} is marked as HRB, checking for BSA asset assignment...`)
    return await assignBSAAssetsToHRB(buildingId, userId)

  } catch (error) {
    console.error('❌ Error in checkAndAssignBSAAssets:', error)
    throw error
  }
}

// Function to get BSA assets summary for a building
export async function getBSAAssetsSummary(buildingId: string) {
  try {
    const { data: bsaAssets, error } = await supabase
      .from('building_assets')
      .select(`
        *,
        compliance_items (
          id,
          name,
          category,
          frequency,
          assigned_to,
          notes
        )
      `)
      .eq('building_id', parseInt(buildingId))
      .in('compliance_items.name', BSA_COMPLIANCE_ASSETS)

    if (error) {
      console.error('❌ Error fetching BSA assets summary:', error)
      return null
    }

    return {
      total: bsaAssets?.length || 0,
      missing: bsaAssets?.filter(asset => asset.status === 'missing').length || 0,
      compliant: bsaAssets?.filter(asset => asset.status === 'compliant').length || 0,
      overdue: bsaAssets?.filter(asset => asset.status === 'overdue').length || 0,
      assets: bsaAssets || []
    }

  } catch (error) {
    console.error('❌ Error in getBSAAssetsSummary:', error)
    return null
  }
} 