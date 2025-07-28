import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    console.log('📧 Adding test emails to database...')

    // Get the first user
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1)

    if (usersError) {
      console.error('❌ Error getting users:', usersError)
      return NextResponse.json({ error: 'Failed to get users' }, { status: 500 })
    }

    let userId: string

    if (!users || users.length === 0) {
      console.log('⚠️ No users found. Creating a test user...')
      // Create a test user
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: 'test@blociq.com',
        password: 'testpassword123',
        email_confirm: true
      })

      if (createUserError) {
        console.error('❌ Error creating test user:', createUserError)
        return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 })
      }

      console.log('✅ Created test user:', newUser.user.id)
      userId = newUser.user.id
    } else {
      userId = users[0].id
      console.log('✅ Using existing user:', userId)
    }

    // Test emails data
    const testEmails = [
      {
        subject: 'Heating Issue in Flat 1',
        from_email: 'john.smith@email.com',
        from_name: 'John Smith',
        body_preview: 'The heating system is not working properly in my flat. Can someone please check it?',
        received_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        is_read: false,
        is_handled: false,
        user_id: userId,
        building_id: '2beeec1d-a94e-4058-b881-213d74cc6830'
      },
      {
        subject: 'Noise Complaint',
        from_email: 'sarah.johnson@email.com',
        from_name: 'Sarah Johnson',
        body_preview: 'There is excessive noise coming from the flat above. Can this be addressed?',
        received_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        is_read: false,
        is_handled: false,
        user_id: userId,
        building_id: '2beeec1d-a94e-4058-b881-213d74cc6830'
      },
      {
        subject: 'Maintenance Request',
        from_email: 'michael.brown@email.com',
        from_name: 'Michael Brown',
        body_preview: 'The kitchen tap is leaking. Please send a plumber.',
        received_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        is_read: true,
        is_handled: true,
        user_id: userId,
        building_id: '2beeec1d-a94e-4058-b881-213d74cc6830'
      },
      {
        subject: 'Parking Space Request',
        from_email: 'emma.davis@email.com',
        from_name: 'Emma Davis',
        body_preview: 'I would like to request a parking space for my vehicle.',
        received_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        is_read: false,
        is_handled: false,
        user_id: userId,
        building_id: '2beeec1d-a94e-4058-b881-213d74cc6830'
      },
      {
        subject: 'Internet Connection Issue',
        from_email: 'david.wilson@email.com',
        from_name: 'David Wilson',
        body_preview: 'The internet connection in my flat is very slow. Can this be investigated?',
        received_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
        is_read: true,
        is_handled: false,
        user_id: userId,
        building_id: '2beeec1d-a94e-4058-b881-213d74cc6830'
      },
      {
        subject: 'Window Repair Needed',
        from_email: 'lisa.anderson@email.com',
        from_name: 'Lisa Anderson',
        body_preview: 'The window in my bedroom is not closing properly. Please arrange for repair.',
        received_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        is_read: false,
        is_handled: false,
        user_id: userId,
        building_id: '2beeec1d-a94e-4058-b881-213d74cc6830'
      },
      {
        subject: 'Electricity Problem',
        from_email: 'robert.taylor@email.com',
        from_name: 'Robert Taylor',
        body_preview: 'There is an electrical issue in my flat. The lights keep flickering.',
        received_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
        is_read: true,
        is_handled: true,
        user_id: userId,
        building_id: '2beeec1d-a94e-4058-b881-213d74cc6830'
      },
      {
        subject: 'Cleaning Service Request',
        from_email: 'jennifer.martinez@email.com',
        from_name: 'Jennifer Martinez',
        body_preview: 'I would like to request a cleaning service for my flat.',
        received_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 days ago
        is_read: false,
        is_handled: false,
        user_id: userId,
        building_id: '2beeec1d-a94e-4058-b881-213d74cc6830'
      },
      {
        subject: 'Package Delivery Issue',
        from_email: 'christopher.lee@email.com',
        from_name: 'Christopher Lee',
        body_preview: 'I have a package that was delivered but I was not home. Can you help?',
        received_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        is_read: true,
        is_handled: false,
        user_id: userId,
        building_id: '2beeec1d-a94e-4058-b881-213d74cc6830'
      },
      {
        subject: 'Security Concern',
        from_email: 'amanda.garcia@email.com',
        from_name: 'Amanda Garcia',
        body_preview: 'I noticed a security issue with the main entrance. Can this be addressed?',
        received_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(), // 11 days ago
        is_read: false,
        is_handled: false,
        user_id: userId,
        building_id: '2beeec1d-a94e-4058-b881-213d74cc6830'
      }
    ]

    console.log(`📧 Inserting ${testEmails.length} test emails...`)

    // Insert test emails
    const { data: insertedEmails, error: insertError } = await supabase
      .from('incoming_emails')
      .insert(testEmails)
      .select()

    if (insertError) {
      console.error('❌ Error inserting emails:', insertError)
      return NextResponse.json({ error: 'Failed to insert emails' }, { status: 500 })
    }

    console.log('✅ Successfully inserted test emails')
    console.log(`📊 Inserted ${insertedEmails.length} emails`)

    // Verify the emails are accessible
    const { data: verifyEmails, error: verifyError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('user_id', userId)

    if (verifyError) {
      console.error('❌ Error verifying emails:', verifyError)
      return NextResponse.json({ error: 'Failed to verify emails' }, { status: 500 })
    }

    console.log(`✅ Verification: ${verifyEmails.length} emails found for user`)

    return NextResponse.json({
      success: true,
      message: 'Test emails added successfully',
      insertedCount: insertedEmails.length,
      totalEmailsForUser: verifyEmails.length,
      userId: userId
    })

  } catch (error) {
    console.error('❌ Error in addTestEmails:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 