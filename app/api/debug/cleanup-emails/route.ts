import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    console.log('🧹 Starting email cleanup...')
    
    // Get current user session
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = user.id
    const userEmail = user.email
    console.log('👤 Cleaning emails for user:', userId, 'Email:', userEmail)
    
    // Delete test emails (from test endpoints)
    const { data: testEmails, error: testError } = await supabase
      .from('incoming_emails')
      .delete()
      .eq('recipient_email', userEmail)
      .eq('sync_status', 'test_inserted')
      .select()
    
    if (testError) {
      console.error('❌ Error deleting test emails:', testError)
    } else {
      console.log(`✅ Deleted ${testEmails?.length || 0} test emails`)
    }
    
    // Delete fake emails (from test@example.com)
    const { data: fakeEmails, error: fakeError } = await supabase
      .from('incoming_emails')
      .delete()
      .eq('recipient_email', userEmail)
      .eq('from_email', 'test@example.com')
      .select()
    
    if (fakeError) {
      console.error('❌ Error deleting fake emails:', fakeError)
    } else {
      console.log(`✅ Deleted ${fakeEmails?.length || 0} fake emails`)
    }
    
    // Delete emails with test subjects
    const { data: testSubjectEmails, error: subjectError } = await supabase
      .from('incoming_emails')
      .delete()
      .eq('recipient_email', userEmail)
      .like('subject', 'Test Email%')
      .select()
    
    if (subjectError) {
      console.error('❌ Error deleting test subject emails:', subjectError)
    } else {
      console.log(`✅ Deleted ${testSubjectEmails?.length || 0} test subject emails`)
    }
    
    // Get remaining email count
    const { data: remainingEmails, error: countError } = await supabase
      .from('incoming_emails')
      .select('id')
      .eq('recipient_email', userEmail)
    
    if (countError) {
      console.error('❌ Error counting remaining emails:', countError)
    } else {
      console.log(`📧 Remaining emails: ${remainingEmails?.length || 0}`)
    }
    
    const totalDeleted = (testEmails?.length || 0) + (fakeEmails?.length || 0) + (testSubjectEmails?.length || 0)
    
    return NextResponse.json({
      success: true,
      message: 'Email cleanup completed',
      deleted: {
        testEmails: testEmails?.length || 0,
        fakeEmails: fakeEmails?.length || 0,
        testSubjectEmails: testSubjectEmails?.length || 0,
        total: totalDeleted
      },
      remaining: remainingEmails?.length || 0,
      userId: userId
    })
    
  } catch (error) {
    console.error('❌ Cleanup error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 