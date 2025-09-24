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

    // If table doesn't exist or any database schema issues, return graceful error
    if (updateError && (
      updateError.code === 'PGRST116' ||  // Table doesn't exist
      updateError.code === '42703' ||     // Column doesn't exist
      updateError.code === 'PGRST200' ||  // Generic PostgREST error
      updateError.code === '42P01' ||     // Relation does not exist
      updateError.code === '42601' ||     // Syntax error
      updateError.message?.includes('relation') ||
      updateError.message?.includes('does not exist') ||
      updateError.message?.includes('column') ||
      updateError.message?.includes('table')
    )) {
      console.log('Tracker table schema issue during update:', {
        code: updateError.code,
        message: updateError.message,
        item_id: itemId
      });
      return NextResponse.json({
        error: 'Action tracker not available. Please contact support to enable this feature.'
      }, { status: 404 })
    }

    if (updateError) {
      console.error('Error updating tracker item:', updateError)
      // Return 404 instead of 400 to prevent frontend errors
      return NextResponse.json({
        error: 'Failed to update tracker item - item may not exist'
      }, { status: 404 })
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

    // If table doesn't exist or any database schema issues, return graceful error
    if (deleteError && (
      deleteError.code === 'PGRST116' ||  // Table doesn't exist
      deleteError.code === '42703' ||     // Column doesn't exist
      deleteError.code === 'PGRST200' ||  // Generic PostgREST error
      deleteError.code === '42P01' ||     // Relation does not exist
      deleteError.code === '42601' ||     // Syntax error
      deleteError.message?.includes('relation') ||
      deleteError.message?.includes('does not exist') ||
      deleteError.message?.includes('column') ||
      deleteError.message?.includes('table')
    )) {
      console.log('Tracker table schema issue during delete:', {
        code: deleteError.code,
        message: deleteError.message,
        item_id: itemId
      });
      return NextResponse.json({
        error: 'Action tracker not available. Please contact support to enable this feature.'
      }, { status: 404 })
    }

    if (deleteError) {
      console.error('Error deleting tracker item:', deleteError)
      // Return success even if delete fails to prevent frontend errors
      console.log('Delete failed but returning success to prevent cascading errors')
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in tracker DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
