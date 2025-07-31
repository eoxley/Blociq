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

    // Check leaseholders data
    console.log('\n👥 Checking leaseholders data...')
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select(`
        id,
        name,
        email,
        phone,
        unit:units(
          unit_number,
          building:buildings(
            name,
            address
          )
        )
      `)
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
          if (lh.unit?.building?.name) {
            console.log(`     Building: ${lh.unit.building.name}`)
          }
        })
      }
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
      }
    } catch (error) {
      console.log('⚠️ Could not test communications log API (server may not be running)')
    }

    console.log('\n✅ Communications setup check completed!')
    console.log('\n🔗 Next steps:')
    console.log('  1. If the table doesn\'t exist, run the SQL script in Supabase dashboard')
    console.log('  2. Test the communications hub at: http://localhost:3000/communications')
    console.log('  3. Try sending test emails and calls')
    
  } catch (error) {
    console.error('❌ Error in communications setup:', error)
  }
}

setupCommunications() 