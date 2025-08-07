import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const testEmail = {
      outlook_message_id: `test-${Date.now()}`,
      subject: 'Test Email - Real-time Test',
      body_preview: 'This is a test email to verify real-time functionality.',
      body: 'This is a test email body to verify that real-time updates are working correctly in the inbox.',
      from_email: 'test@blociq.co.uk',
      from_name: 'Test Sender',
      received_at: new Date().toISOString(),
      is_handled: false,
      is_read: false,
      user_id: userId,
      folder: 'inbox',
      sync_status: 'test_inserted',
      last_sync_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('incoming_emails')
      .insert(testEmail)
      .select()

    if (error) {
      console.error('Failed to insert test email:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test email inserted successfully',
      email: data[0]
    })

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 