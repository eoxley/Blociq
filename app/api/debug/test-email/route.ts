import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test: Inserting test email...')
    
    // Get current user session
    const cookieStore = await cookies()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }
    
    const userId = session.user.id
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
    
    const { data: insertedEmail, error: insertError } = await supabase
      .from('incoming_emails')
      .insert(testEmail)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Failed to insert test email:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    
    console.log('✅ Test email inserted:', insertedEmail.id)
    
    return NextResponse.json({
      success: true,
      message: 'Test email inserted successfully',
      email: insertedEmail,
      userId: userId
    })
    
  } catch (error) {
    console.error('❌ Test email error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 