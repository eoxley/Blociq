import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Simple test: Inserting test email...')
    
    // Get the user ID from the request body
    const { userId } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'No userId provided' }, { status: 400 })
    }
    
    console.log('👤 Test email for user:', userId)
    
    // Insert a test email
    const testEmail = {
      subject: `Test Email ${new Date().toISOString()}`,
      from_email: 'test@example.com',
      from_name: 'Test Sender',
      body_preview: 'This is a test email to verify real-time updates',
      received_at: new Date().toISOString(),
      is_read: false,
      is_handled: false,
      user_id: userId,
      folder: 'inbox',
      sync_status: 'test_inserted',
      last_sync_at: new Date().toISOString()
    }
    
    console.log('📧 Inserting test email with data:', testEmail)
    
    const { data: insertedEmail, error: insertError } = await supabase
      .from('incoming_emails')
      .insert(testEmail)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Failed to insert test email:', insertError)
      return NextResponse.json({ 
        error: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      }, { status: 500 })
    }
    
    console.log('✅ Test email inserted:', insertedEmail.id)
    
    return NextResponse.json({
      success: true,
      message: 'Test email inserted successfully',
      email: insertedEmail,
      userId: userId
    })
    
  } catch (error) {
    console.error('❌ Simple test email error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 