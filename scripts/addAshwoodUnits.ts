import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function addAshwoodUnits() {
  console.log('🏢 Adding units to Ashwood House...')

  // First, find Ashwood House building
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('name', 'Ashwood House')
    .single()

  if (buildingError || !building) {
    console.error('❌ Could not find Ashwood House:', buildingError?.message)
    return
  }

  console.log(`✅ Found building: ${building.name} (ID: ${building.id})`)

  // Create units for Ashwood House
  const units = [
    { building_id: building.id, unit_number: 'Flat 1', type: '1 Bedroom', floor: 'Ground' },
    { building_id: building.id, unit_number: 'Flat 2', type: '2 Bedroom', floor: 'Ground' },
    { building_id: building.id, unit_number: 'Flat 3', type: '1 Bedroom', floor: 'First' },
    { building_id: building.id, unit_number: 'Flat 4', type: '2 Bedroom', floor: 'First' },
    { building_id: building.id, unit_number: 'Flat 5', type: '1 Bedroom', floor: 'Second' },
    { building_id: building.id, unit_number: 'Flat 6', type: '2 Bedroom', floor: 'Second' },
    { building_id: building.id, unit_number: 'Flat 7', type: '1 Bedroom', floor: 'Third' },
    { building_id: building.id, unit_number: 'Flat 8', type: '2 Bedroom', floor: 'Third' },
    { building_id: building.id, unit_number: 'Flat 9', type: '1 Bedroom', floor: 'Fourth' },
    { building_id: building.id, unit_number: 'Flat 10', type: '2 Bedroom', floor: 'Fourth' },
    { building_id: building.id, unit_number: 'Flat 11', type: '1 Bedroom', floor: 'Fifth' },
    { building_id: building.id, unit_number: 'Flat 12', type: '2 Bedroom', floor: 'Fifth' },
    { building_id: building.id, unit_number: 'Flat 13', type: '1 Bedroom', floor: 'Sixth' },
    { building_id: building.id, unit_number: 'Flat 14', type: '2 Bedroom', floor: 'Sixth' },
    { building_id: building.id, unit_number: 'Flat 15', type: '1 Bedroom', floor: 'Seventh' },
    { building_id: building.id, unit_number: 'Flat 16', type: '2 Bedroom', floor: 'Seventh' },
    { building_id: building.id, unit_number: 'Flat 17', type: '1 Bedroom', floor: 'Eighth' },
    { building_id: building.id, unit_number: 'Flat 18', type: '2 Bedroom', floor: 'Eighth' },
    { building_id: building.id, unit_number: 'Flat 19', type: '1 Bedroom', floor: 'Ninth' },
    { building_id: building.id, unit_number: 'Flat 20', type: '2 Bedroom', floor: 'Ninth' },
    { building_id: building.id, unit_number: 'Flat 21', type: '1 Bedroom', floor: 'Tenth' },
    { building_id: building.id, unit_number: 'Flat 22', type: '2 Bedroom', floor: 'Tenth' },
    { building_id: building.id, unit_number: 'Flat 23', type: '1 Bedroom', floor: 'Eleventh' },
    { building_id: building.id, unit_number: 'Flat 24', type: '2 Bedroom', floor: 'Eleventh' }
  ]

  // Insert units
  const { data: insertedUnits, error: unitsError } = await supabase
    .from('units')
    .insert(units)
    .select()

  if (unitsError) {
    console.error('❌ Failed to insert units:', unitsError.message)
    return
  }

  console.log(`✅ Successfully inserted ${insertedUnits.length} units`)

  // Update building unit count
  const { error: updateError } = await supabase
    .from('buildings')
    .update({ unit_count: insertedUnits.length })
    .eq('id', building.id)

  if (updateError) {
    console.error('⚠️ Failed to update building unit count:', updateError.message)
  } else {
    console.log(`✅ Updated building unit count to ${insertedUnits.length}`)
  }

  // Display the inserted units
  console.log('\n📋 Inserted units:')
  insertedUnits.forEach(unit => {
    console.log(`  - ${unit.unit_number} (${unit.type}, ${unit.floor})`)
  })

  console.log('\n🎉 Units successfully added to Ashwood House!')
}

// Run the function if this script is executed directly
if (require.main === module) {
  addAshwoodUnits()
    .then(() => {
      console.log('✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
} 