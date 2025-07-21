import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emailId } = await req.json()

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 })
    }

    // Soft delete the email by marking it as deleted
    // Note: Since is_deleted field doesn't exist in current schema, we'll use handled field as a workaround
    const { error } = await supabase
      .from('incoming_emails')
      .update({ 
        handled: true,
        // Add a note in the tag field to indicate deletion
        tag: 'deleted'
      })
      .eq('id', emailId)

    if (error) {
      console.error('Error marking email as deleted:', error)
      return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Email deleted successfully'
    })

  } catch (error: any) {
    console.error('Error in mark-deleted:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 