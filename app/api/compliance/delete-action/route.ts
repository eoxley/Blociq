import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { actionId, buildingId } = body

    if (!actionId || !buildingId) {
      return NextResponse.json({
        error: 'Missing required fields: actionId and buildingId'
      }, { status: 400 })
    }

    console.log('🗑️ Deleting compliance action item:', {
      actionId,
      buildingId,
      userId: user.id
    })

    // Verify the action exists and user has access
    const { data: actionItem, error: fetchError } = await supabase
      .from('building_action_tracker')
      .select('id, building_id, item_text, created_by')
      .eq('id', actionId)
      .eq('building_id', buildingId)
      .single()

    if (fetchError || !actionItem) {
      return NextResponse.json({
        error: 'Action item not found or access denied'
      }, { status: 404 })
    }

    // Delete the action item
    const { error: deleteError } = await supabase
      .from('building_action_tracker')
      .delete()
      .eq('id', actionId)

    if (deleteError) {
      console.error('❌ Failed to delete action item:', deleteError)
      return NextResponse.json({
        error: 'Failed to delete action item',
        details: deleteError.message
      }, { status: 500 })
    }

    console.log('✅ Successfully deleted action item:', actionItem.item_text)

    return NextResponse.json({
      success: true,
      message: 'Action item deleted successfully',
      deleted_action: {
        id: actionItem.id,
        text: actionItem.item_text
      }
    })

  } catch (error) {
    console.error('❌ Error deleting action item:', error)
    return NextResponse.json({
      error: 'Failed to delete action item',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Support both DELETE and POST methods for flexibility
  return DELETE(request)
}