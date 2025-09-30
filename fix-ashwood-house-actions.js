/**
 * Fix Ashwood House Data Integration Script
 * Creates action tracker items for fire risk assessment and syncs lease data
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function fixAshwoodHouseActions() {
  console.log('🏢 Fixing Ashwood House integration...')

  try {
    // 1. Find Ashwood House building
    const { data: ashwoodBuilding, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .ilike('name', '%ashwood%')
      .single()

    if (buildingError || !ashwoodBuilding) {
      console.log('❌ Ashwood House building not found')
      return
    }

    console.log('✅ Found Ashwood House:', ashwoodBuilding.name, ashwoodBuilding.id)

    // 2. Check for existing action tracker items
    const { data: existingActions } = await supabase
      .from('building_action_tracker')
      .select('*')
      .eq('building_id', ashwoodBuilding.id)

    console.log('📋 Existing action tracker items:', existingActions?.length || 0)

    // 3. Check for fire risk assessment compliance asset
    const { data: complianceAssets } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets(*)
      `)
      .eq('building_id', ashwoodBuilding.id)

    console.log('🔥 Compliance assets found:', complianceAssets?.length || 0)

    const fireRiskAsset = complianceAssets?.find(asset =>
      asset.compliance_assets?.name?.toLowerCase().includes('fire risk')
    )

    if (fireRiskAsset) {
      console.log('🔥 Found fire risk assessment asset:', fireRiskAsset.compliance_assets.name)
      console.log('   Status:', fireRiskAsset.status)
      console.log('   Next due:', fireRiskAsset.next_due_date)
      console.log('   Last carried out:', fireRiskAsset.last_carried_out)

      // 4. Create action tracker items for fire risk assessment
      const fireRiskActions = [
        {
          building_id: ashwoodBuilding.id,
          item_text: 'Review fire risk assessment status',
          notes: `Fire risk assessment for ${ashwoodBuilding.name} - Status: ${fireRiskAsset.status}`,
          priority: fireRiskAsset.status === 'overdue' ? 'urgent' : 'high',
          due_date: fireRiskAsset.next_due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          completed: false,
          source: 'Manual'
        },
        {
          building_id: ashwoodBuilding.id,
          item_text: 'Schedule fire safety inspection',
          notes: `Schedule annual fire safety inspection for ${ashwoodBuilding.name}`,
          priority: 'medium',
          due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          completed: false,
          source: 'Manual'
        }
      ]

      // Check if similar actions already exist
      const hasFireRiskAction = existingActions?.some(action =>
        action.item_text.toLowerCase().includes('fire risk') ||
        action.item_text.toLowerCase().includes('fire safety')
      )

      if (!hasFireRiskAction) {
        console.log('📝 Creating fire risk assessment action items...')
        const { data: newActions, error: actionError } = await supabase
          .from('building_action_tracker')
          .insert(fireRiskActions)
          .select()

        if (actionError) {
          console.error('❌ Error creating action items:', actionError.message)
        } else {
          console.log('✅ Created', newActions?.length || 0, 'action items')
        }
      } else {
        console.log('ℹ️ Fire risk action items already exist')
      }
    }

    // 5. Check for lease data and sync
    const { data: leases } = await supabase
      .from('leases')
      .select('*')
      .eq('building_id', ashwoodBuilding.id)

    console.log('📜 Leases found:', leases?.length || 0)

    if (leases && leases.length > 0) {
      console.log('📜 Lease details:')
      leases.forEach((lease, index) => {
        console.log(`   ${index + 1}. ${lease.leaseholder_name} - ${lease.unit_number}`)
        console.log(`      Start: ${lease.start_date}, End: ${lease.end_date}`)
        console.log(`      Ground rent: ${lease.ground_rent}`)
        console.log(`      Service charge: ${lease.service_charge_percentage}%`)
      })

      // Create lease-related actions
      const leaseActions = leases.map(lease => ({
        building_id: ashwoodBuilding.id,
        item_text: `Review lease for ${lease.unit_number}`,
        notes: `Review lease terms for ${lease.leaseholder_name} in ${lease.unit_number}`,
        priority: 'low',
        due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        completed: false,
        source: 'Manual'
      }))

      const hasLeaseActions = existingActions?.some(action =>
        action.item_text.toLowerCase().includes('lease') ||
        action.item_text.toLowerCase().includes('unit')
      )

      if (!hasLeaseActions && leaseActions.length > 0) {
        console.log('📝 Creating lease review action items...')
        const { data: newLeaseActions, error: leaseActionError } = await supabase
          .from('building_action_tracker')
          .insert(leaseActions)
          .select()

        if (leaseActionError) {
          console.error('❌ Error creating lease actions:', leaseActionError.message)
        } else {
          console.log('✅ Created', newLeaseActions?.length || 0, 'lease action items')
        }
      } else {
        console.log('ℹ️ Lease action items already exist or no leases to process')
      }
    }

    // 6. Summary
    const { data: finalActions } = await supabase
      .from('building_action_tracker')
      .select('*')
      .eq('building_id', ashwoodBuilding.id)

    console.log('📊 Final summary for', ashwoodBuilding.name)
    console.log('   Total action items:', finalActions?.length || 0)
    console.log('   Compliance assets:', complianceAssets?.length || 0)
    console.log('   Leases:', leases?.length || 0)

    if (finalActions && finalActions.length > 0) {
      console.log('\n📋 Current action items:')
      finalActions.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.item_text} (${action.priority})`)
        console.log(`      Due: ${action.due_date || 'No due date'}`)
        console.log(`      Source: ${action.source}`)
      })
    }

    console.log('\n✅ Ashwood House integration fix completed!')

  } catch (error) {
    console.error('❌ Error fixing Ashwood House:', error.message)
  }
}

// Run the fix
if (require.main === module) {
  fixAshwoodHouseActions()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { fixAshwoodHouseActions }