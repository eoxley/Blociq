import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testDynamicUnitCount() {
  console.log('🧪 Testing dynamic unit count calculation...')
  
  try {
    // Fetch all buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address')
      .order('name')

    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError)
      return
    }

    console.log(`📋 Found ${buildings?.length || 0} buildings`)

    // Test dynamic unit count calculation for each building
    for (const building of buildings || []) {
      console.log(`\n🏢 Testing building: ${building.name} (ID: ${building.id})`)
      
      // Count units where unit_number is not null
      const { count: unitCount, error: countError } = await supabase
        .from('units')
        .select('id', { count: 'exact', head: true })
        .eq('building_id', building.id)
        .not('unit_number', 'is', null)

      if (countError) {
        console.error(`❌ Error counting units for ${building.name}:`, countError)
        continue
      }

      console.log(`✅ ${building.name}: ${unitCount || 0} units (dynamically calculated)`)
      
      // Also check the static unit_count field for comparison
      const { data: buildingWithStaticCount } = await supabase
        .from('buildings')
        .select('unit_count')
        .eq('id', building.id)
        .single()

      if (buildingWithStaticCount) {
        console.log(`📊 Static unit_count field: ${buildingWithStaticCount.unit_count || 0}`)
        
        if (buildingWithStaticCount.unit_count !== unitCount) {
          console.log(`⚠️  Mismatch detected! Static: ${buildingWithStaticCount.unit_count}, Dynamic: ${unitCount}`)
        }
      }
    }

    console.log('\n✅ Dynamic unit count test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testDynamicUnitCount() 