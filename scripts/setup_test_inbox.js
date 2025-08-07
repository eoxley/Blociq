require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupTestInbox() {
  console.log('🔧 Setting up test inbox environment...')
  
  try {
    // Test users
    const testUsers = [
      {
        email: 'eleanor.oxley@blociq.co.uk',
        password: 'testpassword123',
        name: 'Eleanor Oxley'
      },
      {
        email: 'testbloc@blociq.co.uk',
        password: 'testpassword123',
        name: 'Test Bloc'
      }
    ]

    // Sample emails for testing
    const sampleEmails = [
      {
        subject: 'Building Maintenance Request',
        from_email: 'tenant@example.com',
        from_name: 'John Smith',
        body_preview: 'Hi, there\'s a leak in the bathroom that needs urgent attention.',
        received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        is_read: false,
        is_handled: false
      },
      {
        subject: 'Section 20 Notice - Major Works',
        from_email: 'management@example.com',
        from_name: 'Property Management Ltd',
        body_preview: 'Please find attached the Section 20 notice for upcoming major works.',
        received_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        is_read: true,
        is_handled: false
      },
      {
        subject: 'Compliance Certificate Renewal',
        from_email: 'compliance@example.com',
        from_name: 'Safety First Compliance',
        body_preview: 'Your building\'s fire safety certificate is due for renewal.',
        received_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        is_read: false,
        is_handled: true
      },
      {
        subject: 'Utility Bill Payment',
        from_email: 'utilities@example.com',
        from_name: 'City Utilities',
        body_preview: 'Your quarterly utility bill is ready for payment.',
        received_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
        is_read: true,
        is_handled: true
      },
      {
        subject: 'Emergency Contact Update',
        from_email: 'admin@example.com',
        from_name: 'Building Administration',
        body_preview: 'Please update your emergency contact information.',
        received_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
        is_read: true,
        is_handled: false
      }
    ]

    console.log('👥 Creating test users...')
    
    for (const user of testUsers) {
      // Check if user already exists by trying to get them
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.error('❌ Error listing users:', listError)
        continue
      }

      const existingUser = existingUsers.users.find(u => u.email === user.email)
      
      if (existingUser) {
        console.log(`✅ User ${user.email} already exists (${existingUser.id})`)
        continue
      }

      // Create user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name }
      })

      if (createError) {
        console.error(`❌ Error creating user ${user.email}:`, createError)
        continue
      }

      console.log(`✅ Created user: ${user.email} (${newUser.user.id})`)
    }

    console.log('📧 Creating sample emails...')
    
    // Get all users to assign emails to
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }

    const testUserIds = users.users
      .filter(user => testUsers.some(testUser => testUser.email === user.email))
      .map(user => user.id)

    console.log(`Found ${testUserIds.length} test users:`, testUserIds)

    // Create sample emails for each test user
    for (const userId of testUserIds) {
      for (const email of sampleEmails) {
        const { error: insertError } = await supabase
          .from('incoming_emails')
          .insert({
            ...email,
            user_id: userId,
            created_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('❌ Error inserting email:', insertError)
        } else {
          console.log(`✅ Created email "${email.subject}" for user ${userId}`)
        }
      }
    }

    console.log('✅ Test inbox setup completed!')
    console.log('\n📋 Test Users:')
    testUsers.forEach(user => {
      console.log(`  - ${user.email} (password: ${user.password})`)
    })
    console.log('\n📧 Sample emails created for each user')
    console.log('\n🔗 You can now test the inbox at: http://localhost:3000/inbox')

  } catch (error) {
    console.error('❌ Error setting up test inbox:', error)
  }
}

setupTestInbox() 