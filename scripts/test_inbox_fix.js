const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testInboxFix() {
  console.log('🧪 Testing Inbox Fix...')
  
  try {
    // Test 1: Check if incoming_emails table exists and has the right schema
    console.log('\n📋 Test 1: Checking table schema...')
    const { data: schemaData, error: schemaError } = await supabase
      .from('incoming_emails')
      .select('*')
      .limit(1)
    
    if (schemaError) {
      console.error('❌ Schema error:', schemaError)
      return
    }
    
    console.log('✅ Table exists and is accessible')
    console.log('📊 Sample record fields:', Object.keys(schemaData[0] || {}))
    
    // Test 2: Check for emails with to_email field
    console.log('\n📧 Test 2: Checking for emails with to_email field...')
    const { data: emailsWithToEmail, error: toEmailError } = await supabase
      .from('incoming_emails')
      .select('id, to_email, from_email, subject')
      .not('to_email', 'is', null)
      .limit(5)
    
    if (toEmailError) {
      console.error('❌ to_email query error:', toEmailError)
    } else {
      console.log(`✅ Found ${emailsWithToEmail.length} emails with to_email field`)
      emailsWithToEmail.forEach(email => {
        console.log(`  - ID: ${email.id}, To: ${email.to_email}, From: ${email.from_email}, Subject: ${email.subject}`)
      })
    }
    
    // Test 3: Test the new query logic for a specific user email
    const testUserEmail = 'eleanor.oxley@blociq.co.uk' // or 'testbloc@blociq.co.uk'
    console.log(`\n👤 Test 3: Testing query for user ${testUserEmail}...`)
    
    const { data: userEmails, error: userError } = await supabase
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
        updated_at,
        building_id,
        unit_id,
        leaseholder_id,
        to_email
      `)
      .or(`to_email.cs.{${testUserEmail}},to_email.ilike.%${testUserEmail}%`)
      .order('received_at', { ascending: false })
      .limit(10)
    
    if (userError) {
      console.error('❌ User email query error:', userError)
    } else {
      console.log(`✅ Found ${userEmails.length} emails for ${testUserEmail}`)
      userEmails.forEach(email => {
        console.log(`  - ID: ${email.id}, To: ${email.to_email}, From: ${email.from_email}, Subject: ${email.subject}`)
      })
    }
    
    // Test 4: Check total email count
    console.log('\n📊 Test 4: Checking total email count...')
    const { count: totalEmails, error: countError } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Count error:', countError)
    } else {
      console.log(`✅ Total emails in database: ${totalEmails}`)
    }
    
    console.log('\n🎉 Inbox fix test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testInboxFix() 