import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debug: Checking database schema...')
    
    // Get current user session
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = user.id
    const userEmail = user.email
    console.log('👤 Checking schema for user:', userId, 'Email:', userEmail)
    
    // Try to get a single row to see the schema
    const { data: sampleRow, error: sampleError } = await supabase
      .from('incoming_emails')
      .select('*')
      .limit(1)
    
    console.log('🔍 Sample row:', sampleRow)
    console.log('🔍 Sample error:', sampleError)
    
    // Get all emails to see what columns exist
    const { data: allEmails, error: allEmailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .limit(5)
    
    console.log('🔍 All emails sample:', allEmails)
    console.log('🔍 All emails error:', allEmailsError)
    
    // Try to get emails by user_id
    const { data: userEmails, error: userEmailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('user_id', userId)
      .limit(5)
    
    console.log('🔍 User emails:', userEmails)
    console.log('🔍 User emails error:', userEmailsError)
    
    // Try to get emails by from_email (to see if we can filter by email)
    const { data: emailFiltered, error: emailFilteredError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('from_email', userEmail)
      .limit(5)
    
    console.log('🔍 Email filtered:', emailFiltered)
    console.log('🔍 Email filtered error:', emailFilteredError)
    
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userEmail
      },
      schema: {
        sampleRow: sampleRow || null,
        sampleError: sampleError?.message || null,
        allEmails: allEmails || [],
        allEmailsError: allEmailsError?.message || null,
        userEmails: userEmails || [],
        userEmailsError: userEmailsError?.message || null,
        emailFiltered: emailFiltered || [],
        emailFilteredError: emailFilteredError?.message || null,
        availableColumns: sampleRow ? Object.keys(sampleRow) : []
      },
      debug: {
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 