import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch all drafts for the user (both email drafts and reply drafts)
    const responses = await Promise.all([
      supabase
        .from('email_drafts')
        .select(`
          id,
          subject,
          recipient,
          building_id,
          draft_content,
          context,
          created_at,
          updated_at,
          buildings(name, address)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('email_reply_drafts')
        .select(`
          id,
          email_id,
          building_id,
          draft_content,
          created_at,
          updated_at,
          buildings(name, address),
          incoming_emails(subject, from_email, body_preview)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ])

    // Safe destructuring with fallback
    const [emailDraftsResult, replyDraftsResult] = responses || [{}, {}];

    if (emailDraftsResult.error) {
      console.error('Error fetching email drafts:', emailDraftsResult.error)
      return NextResponse.json({ error: 'Failed to fetch email drafts' }, { status: 500 })
    }

    if (replyDraftsResult.error) {
      console.error('Error fetching reply drafts:', replyDraftsResult.error)
      return NextResponse.json({ error: 'Failed to fetch reply drafts' }, { status: 500 })
    }

    // Transform the data to a unified format
    const emailDrafts = (emailDraftsResult.data || []).map(draft => ({
      id: draft.id,
      type: 'email',
      subject: draft.subject,
      recipient: draft.recipient,
      building_id: draft.building_id,
      building_name: draft.buildings?.name,
      building_address: draft.buildings?.address,
      content: draft.draft_content,
      context: draft.context,
      created_at: draft.created_at,
      updated_at: draft.updated_at
    }))

    const replyDrafts = (replyDraftsResult.data || []).map(draft => ({
      id: draft.id,
      type: 'reply',
      email_id: draft.email_id,
      subject: `Re: ${draft.incoming_emails?.subject || 'Email'}`,
      original_email: draft.incoming_emails,
      building_id: draft.building_id,
      building_name: draft.buildings?.name,
      building_address: draft.buildings?.address,
      content: draft.draft_content,
      created_at: draft.created_at,
      updated_at: draft.updated_at
    }))

    const allDrafts = [...emailDrafts, ...replyDrafts].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({
      success: true,
      drafts: allDrafts,
      count: allDrafts.length
    })

  } catch (error) {
    console.error('Error in drafts GET:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.id
    const { type, subject, recipient, building_id, content, context, email_id } = await req.json()

    if (!type || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let result

    if (type === 'email') {
      // Create new email draft
      result = await supabase
        .from('email_drafts')
        .insert({
          user_id: userId,
          subject: subject || 'Untitled Draft',
          recipient,
          building_id,
          draft_content: content,
          context
        })
        .select()
        .single()
    } else if (type === 'reply') {
      // Create reply draft
      if (!email_id) {
        return NextResponse.json({ error: 'Email ID required for reply drafts' }, { status: 400 })
      }
      
      result = await supabase
        .from('email_reply_drafts')
        .insert({
          user_id: userId,
          email_id,
          building_id,
          draft_content: content
        })
        .select()
        .single()
    } else {
      return NextResponse.json({ error: 'Invalid draft type' }, { status: 400 })
    }

    if (result.error) {
      console.error('Error creating draft:', result.error)
      return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      draft: result.data
    })

  } catch (error) {
    console.error('Error in drafts POST:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.id
    const { id, type, subject, recipient, building_id, content, context } = await req.json()

    if (!id || !type || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let result

    if (type === 'email') {
      result = await supabase
        .from('email_drafts')
        .update({
          subject,
          recipient,
          building_id,
          draft_content: content,
          context,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
    } else if (type === 'reply') {
      result = await supabase
        .from('email_reply_drafts')
        .update({
          building_id,
          draft_content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
    } else {
      return NextResponse.json({ error: 'Invalid draft type' }, { status: 400 })
    }

    if (result.error) {
      console.error('Error updating draft:', result.error)
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      draft: result.data
    })

  } catch (error) {
    console.error('Error in drafts PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.id
    const { id, type } = await req.json()

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let result

    if (type === 'email') {
      result = await supabase
        .from('email_drafts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
    } else if (type === 'reply') {
      result = await supabase
        .from('email_reply_drafts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
    } else {
      return NextResponse.json({ error: 'Invalid draft type' }, { status: 400 })
    }

    if (result.error) {
      console.error('Error deleting draft:', result.error)
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully'
    })

  } catch (error) {
    console.error('Error in drafts DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
