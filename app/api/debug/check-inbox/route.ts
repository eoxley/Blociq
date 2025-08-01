import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debug: Checking inbox database state...')
    
    // Get current user session
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = user.id
    const userEmail = user.email
    console.log('👤 Checking inbox for user:', userId, 'Email:', userEmail)
    
    // Get total count of emails for this user by recipient_email
    const { count: totalCount, error: countError } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_email', userEmail)
    
    if (countError) {
      console.error('❌ Error counting emails:', countError)
      return NextResponse.json({ error: 'Failed to count emails' }, { status: 500 })
    }
    
    // Get sample emails to check data
    const { data: sampleEmails, error: sampleError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('recipient_email', userEmail)
      .order('received_at', { ascending: false })
      .limit(10)
    
    if (sampleError) {
      console.error('❌ Error fetching sample emails:', sampleError)
      return NextResponse.json({ error: 'Failed to fetch sample emails' }, { status: 500 })
    }
    
    // Check for emails with different recipient_email (potential data issues)
    const { data: otherUserEmails, error: otherUserError } = await supabase
      .from('incoming_emails')
      .select('recipient_email, count')
      .neq('recipient_email', userEmail)
      .limit(5)
    
    // Check for emails without recipient_email
    const { data: noUserEmails, error: noUserError } = await supabase
      .from('incoming_emails')
      .select('id, recipient_email, from_email, subject')
      .is('recipient_email', null)
      .limit(5)
    
    // Get database schema info
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('incoming_emails')
      .select('*')
      .limit(0)
    
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: user.email
      },
      database: {
        totalEmailsForUser: totalCount,
        sampleEmails: sampleEmails || [],
        otherUserEmails: otherUserEmails || [],
        noUserEmails: noUserEmails || [],
        schemaColumns: schemaInfo ? Object.keys(schemaInfo[0] || {}) : []
      },
      debug: {
        timestamp: new Date().toISOString(),
        userAgent: req.headers.get('user-agent'),
        url: req.url
      }
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 