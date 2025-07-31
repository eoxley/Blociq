import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    // Get the current user's session
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
    
    if (sessionError || !session) {
      console.error('❌ No authenticated session found')
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    console.log('🔄 Fixing email user association for user:', userId)

    // Find emails without user_id
    const { data: emailsWithoutUserId, error: fetchError } = await supabase
      .from('incoming_emails')
      .select('id, subject, from_email')
      .is('user_id', null)

    if (fetchError) {
      console.error('❌ Error fetching emails without user_id:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch emails' },
        { status: 500 }
      )
    }

    console.log(`📧 Found ${emailsWithoutUserId?.length || 0} emails without user_id`)

    if (!emailsWithoutUserId || emailsWithoutUserId.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No emails found without user_id',
        updatedCount: 0
      })
    }

    // Update emails to associate with current user
    const { error: updateError } = await supabase
      .from('incoming_emails')
      .update({ user_id: userId })
      .is('user_id', null)

    if (updateError) {
      console.error('❌ Error updating emails:', updateError)
      return NextResponse.json(
        { error: 'Failed to update emails' },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully associated ${emailsWithoutUserId.length} emails with user ${userId}`)

    return NextResponse.json({
      success: true,
      message: `Successfully associated ${emailsWithoutUserId.length} emails with your account`,
      updatedCount: emailsWithoutUserId.length
    })

  } catch (error) {
    console.error('❌ Error fixing email user association:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 