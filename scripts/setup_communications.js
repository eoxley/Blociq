require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupCommunications() {
  console.log('🔧 Setting up communications system...')
  
  try {
    // Check if communications_log table exists
    console.log('🔍 Checking if communications_log table exists...')
    const { data: existingLogs, error: checkError } = await supabase
      .from('communications_log')
      .select('id')
      .limit(1)
    
    if (checkError && checkError.code === 'PGRST204') {
      console.log('❌ communications_log table does not exist')
      console.log('📝 Please run the SQL script: scripts/create_communications_log.sql')
      console.log('🔗 Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT]/editor')
    } else if (checkError) {
      console.error('❌ Error checking communications_log table:', checkError)
    } else {
      console.log('✅ communications_log table exists')
    }

    // Check leaseholders data with simpler query to avoid relationship conflicts
    console.log('\n👥 Checking leaseholders data...')
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('id, name, email, phone')
      .limit(5)

    if (leaseholdersError) {
      console.error('❌ Error fetching leaseholders:', leaseholdersError)
    } else {
      console.log(`✅ Found ${leaseholders?.length || 0} leaseholders`)
      
      if (leaseholders && leaseholders.length > 0) {
        console.log('\n📋 Sample leaseholders:')
        leaseholders.forEach((lh, index) => {
          const hasEmail = lh.email ? '✅' : '❌'
          const hasPhone = lh.phone ? '✅' : '❌'
          console.log(`  ${index + 1}. ${lh.name || 'Unknown'} ${hasEmail} ${hasPhone}`)
        })
      }
    }

    // Check units data separately
    console.log('\n🏠 Checking units data...')
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number, building_id')
      .limit(5)

    if (unitsError) {
      console.error('❌ Error fetching units:', unitsError)
    } else {
      console.log(`✅ Found ${units?.length || 0} units`)
    }

    // Check buildings data
    console.log('\n🏢 Checking buildings data...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address')
      .limit(5)

    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError)
    } else {
      console.log(`✅ Found ${buildings?.length || 0} buildings`)
      
      if (buildings && buildings.length > 0) {
        console.log('\n📋 Sample buildings:')
        buildings.forEach((building, index) => {
          console.log(`  ${index + 1}. ${building.name}`)
          if (building.address) {
            console.log(`     Address: ${building.address}`)
          }
        })
      }
    }

    // Test API endpoints
    console.log('\n🧪 Testing API endpoints...')
    
    // Test communications log API
    try {
      const logResponse = await fetch('http://localhost:3000/api/communications/log', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (logResponse.ok) {
        console.log('✅ Communications log API is working')
      } else {
        console.log('⚠️ Communications log API returned:', logResponse.status)
        if (logResponse.status === 401) {
          console.log('   This is expected - API requires authentication')
        }
      }
    } catch (error) {
      console.log('⚠️ Could not test communications log API (server may not be running)')
    }

    console.log('\n✅ Communications setup check completed!')
    console.log('\n🔗 Next steps:')
    console.log('  1. Test the communications hub at: http://localhost:3000/communications')
    console.log('  2. Try sending test emails and calls')
    console.log('  3. Check browser console for any errors')
    
  } catch (error) {
    console.error('❌ Error in communications setup:', error)
  }
}

setupCommunications() 