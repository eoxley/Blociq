const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('🧪 Testing Local Supabase Connection...')

// Local Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

console.log('🔗 Supabase URL:', supabaseUrl)
console.log('🔑 Using local development keys')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLocalSupabase() {
  try {
    console.log('\n📋 Step 1: Testing basic connection...')
    
    // Test basic connection
    const { data: healthData, error: healthError } = await supabase.from('buildings').select('count').limit(1)
    
    if (healthError) {
      console.log('❌ Connection failed:', healthError.message)
      console.log('💡 Make sure local Supabase is running: supabase start')
      return false
    }
    
    console.log('✅ Basic connection successful')
    
    // Test specific tables
    console.log('\n📋 Step 2: Testing table access...')
    
    const tables = ['buildings', 'incoming_emails', 'leaseholders', 'units']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        
        if (error) {
          console.log(`⚠️ Table '${table}': ${error.message}`)
        } else {
          console.log(`✅ Table '${table}': ${data?.length || 0} records`)
        }
      } catch (err) {
        console.log(`❌ Table '${table}': ${err.message}`)
      }
    }
    
    // Test auth
    console.log('\n📋 Step 3: Testing authentication...')
    
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.log('⚠️ Auth test failed:', authError.message)
    } else {
      console.log('✅ Authentication system working')
    }
    
    console.log('\n🎉 Local Supabase connection test completed!')
    console.log('\n📝 Available URLs:')
    console.log('- API: http://localhost:54321')
    console.log('- Studio: http://localhost:54323')
    console.log('- Database: postgresql://postgres:postgres@localhost:54322/postgres')
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

// Run the test
testLocalSupabase().catch(console.error) 