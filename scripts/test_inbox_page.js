const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('🧪 Testing Inbox Page Query...')

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔗 Supabase URL:', supabaseUrl)
console.log('🔑 Using environment keys')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testInboxQuery() {
  try {
    console.log('\n📋 Testing inbox query...')
    
    // Test the exact query from the inbox page
    const { data: emails, error } = await supabase
      .from('incoming_emails')
      .select(`
        id, 
        subject, 
        from_email, 
        from_name, 
        body_preview, 
        received_at, 
        is_read, 
        is_handled, 
        user_id, 
        created_at,
        building_id,
        related_unit_id
      `)
      .limit(5)
    
    if (error) {
      console.error('❌ Query failed:', error.message)
      console.error('Error details:', error)
      return false
    }
    
    console.log(`✅ Query successful! Found ${emails?.length || 0} emails`)
    
    if (emails && emails.length > 0) {
      console.log('\n📧 Sample emails:')
      emails.forEach((email, index) => {
        console.log(`  ${index + 1}. Subject: "${email.subject}"`)
        console.log(`     From: ${email.from_email}`)
        console.log(`     Received: ${email.received_at}`)
        console.log(`     User ID: ${email.user_id}`)
        console.log('')
      })
    } else {
      console.log('⚠️ No emails found in database')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

// Run the test
testInboxQuery().then(success => {
  if (success) {
    console.log('\n🎉 Inbox page query is working!')
    console.log('✅ You can now test the inbox page at: http://localhost:3003/inbox')
  } else {
    console.log('\n❌ Inbox page query failed')
    console.log('💡 Check the database connection and schema')
  }
}).catch(console.error) 