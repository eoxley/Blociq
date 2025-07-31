require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCommunications() {
  console.log('🧪 Testing Communications Hub functionality...')
  
  try {
    // Test 1: Check if we can fetch leaseholders
    console.log('\n📞 Test 1: Leaseholder Data')
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('id, name, email, phone')
      .limit(3)

    if (leaseholdersError) {
      console.error('❌ Error fetching leaseholders:', leaseholdersError)
    } else {
      console.log(`✅ Found ${leaseholders?.length || 0} leaseholders`)
      leaseholders?.forEach((lh, index) => {
        console.log(`  ${index + 1}. ${lh.name || 'Unknown'} - Email: ${lh.email ? '✅' : '❌'} Phone: ${lh.phone ? '✅' : '❌'}`)
      })
    }

    // Test 2: Check if we can fetch buildings
    console.log('\n🏢 Test 2: Building Data')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address')
      .limit(3)

    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError)
    } else {
      console.log(`✅ Found ${buildings?.length || 0} buildings`)
      buildings?.forEach((building, index) => {
        console.log(`  ${index + 1}. ${building.name} - ${building.address || 'No address'}`)
      })
    }

    // Test 3: Check if we can fetch units
    console.log('\n🏠 Test 3: Unit Data')
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number, building_id')
      .limit(3)

    if (unitsError) {
      console.error('❌ Error fetching units:', unitsError)
    } else {
      console.log(`✅ Found ${units?.length || 0} units`)
      units?.forEach((unit, index) => {
        console.log(`  ${index + 1}. Unit ${unit.unit_number} - Building ID: ${unit.building_id}`)
      })
    }

    // Test 4: Check communications log
    console.log('\n📝 Test 4: Communications Log')
    const { data: communications, error: commError } = await supabase
      .from('communications_log')
      .select('*')
      .limit(3)

    if (commError) {
      console.error('❌ Error fetching communications log:', commError)
    } else {
      console.log(`✅ Found ${communications?.length || 0} communications`)
      communications?.forEach((comm, index) => {
        console.log(`  ${index + 1}. ${comm.type} - ${comm.leaseholder_name} - ${comm.subject}`)
      })
    }

    // Test 5: Test API endpoints (if server is running)
    console.log('\n🌐 Test 5: API Endpoints')
    try {
      const logResponse = await fetch('http://localhost:3000/api/communications/log', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (logResponse.status === 401) {
        console.log('✅ API endpoint exists (401 is expected for unauthenticated requests)')
      } else if (logResponse.ok) {
        console.log('✅ API endpoint is working')
      } else {
        console.log(`⚠️ API endpoint returned: ${logResponse.status}`)
      }
    } catch (error) {
      console.log('⚠️ Could not test API endpoint (server may not be running)')
    }

    console.log('\n✅ Communications Hub test completed!')
    console.log('\n📊 Summary:')
    console.log(`  - Leaseholders: ${leaseholders?.length || 0}`)
    console.log(`  - Buildings: ${buildings?.length || 0}`)
    console.log(`  - Units: ${units?.length || 0}`)
    console.log(`  - Communications: ${communications?.length || 0}`)
    
    console.log('\n🔗 Next steps:')
    console.log('  1. Visit http://localhost:3000/communications')
    console.log('  2. Test the call functionality')
    console.log('  3. Test the email functionality')
    console.log('  4. Check browser console for any errors')

  } catch (error) {
    console.error('❌ Error in communications test:', error)
  }
}

testCommunications() 