import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const itemId = params.id
    const body = await request.json()

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID format' }, { status: 400 })
    }

    const updates = {
      ...body,
      updated_at: new Date().toISOString()
    }

    // If marking as completed, add completion timestamp
    if (body.completed === true) {
      updates.completed_at = new Date().toISOString()
    } else if (body.completed === false) {
      updates.completed_at = null
    }

    // Update tracker item
    const { data: updatedItem, error: updateError } = await supabase
      .from('building_action_tracker')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    // If table doesn't exist, return error
    if (updateError && updateError.code === 'PGRST116') {
      return NextResponse.json({
        error: 'Action tracker not available. Please contact support to enable this feature.'
      }, { status: 404 })
    }

    if (updateError) {
      console.error('Error updating tracker item:', updateError)
      return NextResponse.json({ error: 'Failed to update tracker item' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: updatedItem
    })

  } catch (error) {
    console.error('Unexpected error in tracker PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const itemId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID format' }, { status: 400 })
    }

    // Delete tracker item
    const { error: deleteError } = await supabase
      .from('building_action_tracker')
      .delete()
      .eq('id', itemId)

    // If table doesn't exist, return error
    if (deleteError && deleteError.code === 'PGRST116') {
      return NextResponse.json({
        error: 'Action tracker not available. Please contact support to enable this feature.'
      }, { status: 404 })
    }

    if (deleteError) {
      console.error('Error deleting tracker item:', deleteError)
      return NextResponse.json({ error: 'Failed to delete tracker item' }, { status: 400 })
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in tracker DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
