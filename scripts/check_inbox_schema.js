const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkInboxSchema() {
  console.log('🔍 Checking Inbox Database Schema...')
  
  try {
    // 1. Check if incoming_emails table exists and get its structure
    console.log('\n📋 Step 1: Checking incoming_emails table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('incoming_emails')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Table error:', tableError)
      return
    }
    
    if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Table exists')
      console.log('📊 Available columns:', Object.keys(tableInfo[0]))
    } else {
      console.log('⚠️ Table exists but is empty')
    }
    
    // 2. Check for specific columns
    console.log('\n🔍 Step 2: Checking for specific columns...')
    
    const sampleRecord = tableInfo?.[0] || {}
    const hasUserId = 'user_id' in sampleRecord
    const hasToEmail = 'to_email' in sampleRecord
    const hasFromEmail = 'from_email' in sampleRecord
    
    console.log(`- user_id column: ${hasUserId ? '✅ EXISTS' : '❌ MISSING'}`)
    console.log(`- to_email column: ${hasToEmail ? '✅ EXISTS' : '❌ MISSING'}`)
    console.log(`- from_email column: ${hasFromEmail ? '✅ EXISTS' : '❌ MISSING'}`)
    
    // 3. Test the current query approach
    console.log('\n🧪 Step 3: Testing current query approach...')
    
    // Get a sample user_id to test with
    const { data: sampleEmails, error: sampleError } = await supabase
      .from('incoming_emails')
      .select('user_id')
      .not('user_id', 'is', null)
      .limit(1)
    
    if (sampleError) {
      console.error('❌ Sample query error:', sampleError)
    } else if (sampleEmails && sampleEmails.length > 0) {
      const testUserId = sampleEmails[0].user_id
      console.log(`✅ Found sample user_id: ${testUserId}`)
      
             // Test the actual query
       const { data: testEmails, error: testError } = await supabase
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
         .eq('user_id', testUserId)
         .order('received_at', { ascending: false })
         .limit(5)
      
      if (testError) {
        console.error('❌ Test query error:', testError)
      } else {
        console.log(`✅ Test query successful! Found ${testEmails.length} emails`)
        testEmails.forEach((email, index) => {
          console.log(`  ${index + 1}. ID: ${email.id}, Subject: ${email.subject}, From: ${email.from_email}`)
        })
      }
    } else {
      console.log('⚠️ No emails with user_id found to test with')
    }
    
    // 4. Check total email count
    console.log('\n📊 Step 4: Checking total email count...')
    const { count: totalEmails, error: countError } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Count error:', countError)
    } else {
      console.log(`✅ Total emails in database: ${totalEmails}`)
    }
    
    console.log('\n🎉 Schema check completed!')
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

// Run the check
checkInboxSchema() 