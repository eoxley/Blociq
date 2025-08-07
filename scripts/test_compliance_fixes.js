require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testComplianceFixes() {
  console.log('🧪 Testing compliance and buildings fixes...')
  
  try {
    // Test 1: Check if compliance_assets table exists and has data
    console.log('\n📋 Test 1: Checking compliance_assets table...')
    const { data: complianceAssets, error: complianceError } = await supabase
      .from('compliance_assets')
      .select('*')
      .limit(5)
    
    if (complianceError) {
      console.error('❌ Compliance assets error:', complianceError)
    } else {
      console.log(`✅ Found ${complianceAssets?.length || 0} compliance assets`)
      if (complianceAssets && complianceAssets.length > 0) {
        console.log('Sample asset:', {
          id: complianceAssets[0].id,
          name: complianceAssets[0].name,
          description: complianceAssets[0].description,
          category: complianceAssets[0].category
        })
      }
    }

    // Test 2: Check if buildings table exists and has data
    console.log('\n🏢 Test 2: Checking buildings table...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .limit(5)
    
    if (buildingsError) {
      console.error('❌ Buildings error:', buildingsError)
    } else {
      console.log(`✅ Found ${buildings?.length || 0} buildings`)
      if (buildings && buildings.length > 0) {
        console.log('Sample building:', {
          id: buildings[0].id,
          name: buildings[0].name,
          address: buildings[0].address
        })
      }
    }

    // Test 3: Check if building_todos table exists
    console.log('\n📝 Test 3: Checking building_todos table...')
    const { data: todos, error: todosError } = await supabase
      .from('building_todos')
      .select('*')
      .limit(5)
    
    if (todosError) {
      console.error('❌ Building todos error:', todosError)
    } else {
      console.log(`✅ Found ${todos?.length || 0} building todos`)
      if (todos && todos.length > 0) {
        console.log('Sample todo:', {
          id: todos[0].id,
          title: todos[0].title,
          status: todos[0].status,
          building_id: todos[0].building_id
        })
      }
    }

    // Test 4: Check if incoming_emails table exists
    console.log('\n📧 Test 4: Checking incoming_emails table...')
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .limit(5)
    
    if (emailsError) {
      console.error('❌ Incoming emails error:', emailsError)
    } else {
      console.log(`✅ Found ${emails?.length || 0} incoming emails`)
      if (emails && emails.length > 0) {
        console.log('Sample email:', {
          id: emails[0].id,
          subject: emails[0].subject,
          from_email: emails[0].from_email,
          user_id: emails[0].user_id
        })
      }
    }

    console.log('\n✅ All tests completed!')
    console.log('\n🔗 You can now test the pages at:')
    console.log('  - http://localhost:3000/compliance')
    console.log('  - http://localhost:3000/buildings')
    console.log('  - http://localhost:3000/inbox')

  } catch (error) {
    console.error('❌ Error running tests:', error)
  }
}

testComplianceFixes() 