import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixAshwoodUnitCount() {
  console.log('🔍 Checking Ashwood House unit count...')

  try {
    // First, find Ashwood House building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, unit_count')
      .eq('name', 'Ashwood House')
      .single()

    if (buildingError || !building) {
      console.error('❌ Could not find Ashwood House:', buildingError?.message)
      return
    }

    console.log(`✅ Found building: ${building.name} (ID: ${building.id})`)
    console.log(`📊 Current unit_count in database: ${building.unit_count}`)

    // Count actual units in the database
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number')
      .eq('building_id', building.id)

    if (unitsError) {
      console.error('❌ Failed to fetch units:', unitsError.message)
      return
    }

    console.log(`🏠 Actual units found in database: ${units.length}`)
    
    if (units.length > 0) {
      console.log('📋 Units:')
      units.forEach(unit => {
        console.log(`  - ${unit.unit_number}`)
      })
    }

    // Check if unit_count needs to be updated
    if (building.unit_count !== units.length) {
      console.log(`⚠️ Mismatch detected! Database shows ${building.unit_count} but there are ${units.length} actual units.`)
      
      // Update the unit_count
      const { error: updateError } = await supabase
        .from('buildings')
        .update({ unit_count: units.length })
        .eq('id', building.id)

      if (updateError) {
        console.error('❌ Failed to update building unit count:', updateError.message)
      } else {
        console.log(`✅ Updated building unit count to ${units.length}`)
      }
    } else {
      console.log('✅ Unit count is correct!')
    }

    console.log('\n🎉 Ashwood House unit count check complete!')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the function
fixAshwoodUnitCount()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 