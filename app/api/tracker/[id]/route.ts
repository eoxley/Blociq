import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const itemId = params.id;
    const body = await request.json();

    // Validate item ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(itemId)) {
      return NextResponse.json(
        { error: 'Invalid item ID format' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: any = {};

    // Validate and add fields to update
    if (body.item_text !== undefined) {
      if (typeof body.item_text !== 'string' || body.item_text.trim().length === 0) {
        return NextResponse.json(
          { error: 'item_text must be a non-empty string' },
          { status: 400 }
        );
      }
      updates.item_text = body.item_text.trim();
    }

    if (body.due_date !== undefined) {
      if (body.due_date !== null) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(body.due_date)) {
          return NextResponse.json(
            { error: 'Invalid due_date format. Use YYYY-MM-DD or null' },
            { status: 400 }
          );
        }
      }
      updates.due_date = body.due_date;
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes?.trim() || null;
    }

    if (body.priority !== undefined) {
      const allowedPriorities = ['low', 'medium', 'high'];
      if (!allowedPriorities.includes(body.priority)) {
        return NextResponse.json(
          { error: 'Invalid priority value' },
          { status: 400 }
        );
      }
      updates.priority = body.priority;
    }

    if (body.source !== undefined) {
      const allowedSources = ['Manual', 'Meeting', 'Call', 'Email'];
      if (!allowedSources.includes(body.source)) {
        return NextResponse.json(
          { error: 'Invalid source value' },
          { status: 400 }
        );
      }
      updates.source = body.source;
    }

    if (body.completed !== undefined) {
      if (typeof body.completed !== 'boolean') {
        return NextResponse.json(
          { error: 'completed must be a boolean' },
          { status: 400 }
        );
      }
      updates.completed = body.completed;
      
      // Set completed_at timestamp when marking as completed
      if (body.completed) {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }
    }

    // Check if there are any updates to make
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the tracker item
    const { data: updatedItem, error } = await supabase
      .from('building_action_tracker')
      .update(updates)
      .eq('id', itemId)
      .eq('created_by', user.id) // Ensure user can only update their own items
      .select()
      .single();

    if (error) {
      console.error('Error updating tracker item:', error);
      
      // Check if item wasn't found or user doesn't have permission
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Tracker item not found or access denied' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update tracker item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedItem
    });

  } catch (error) {
    console.error('Error in tracker PATCH endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const itemId = params.id;

    // Validate item ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(itemId)) {
      return NextResponse.json(
        { error: 'Invalid item ID format' },
        { status: 400 }
      );
    }

    // Delete the tracker item
    const { error } = await supabase
      .from('building_action_tracker')
      .delete()
      .eq('id', itemId)
      .eq('created_by', user.id); // Ensure user can only delete their own items

    if (error) {
      console.error('Error deleting tracker item:', error);
      return NextResponse.json(
        { error: 'Failed to delete tracker item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tracker item deleted successfully'
    });

  } catch (error) {
    console.error('Error in tracker DELETE endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}