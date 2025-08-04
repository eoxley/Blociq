import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      building_id, 
      due_date, 
      priority = 'Medium',
      assigned_to,
      status = 'pending'
    } = body

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Create the todo
    const { data, error } = await supabase
      .from('building_todos')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        building_id: building_id || null,
        due_date: due_date || null,
        priority,
        assigned_to: assigned_to || null,
        status,
        is_complete: status === 'completed',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating todo:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Task created successfully',
      todo: data 
    })

  } catch (error) {
    console.error('Error in add-building-todo API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      id,
      title, 
      description, 
      building_id, 
      due_date, 
      priority,
      assigned_to,
      status
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Update the todo
    const { data, error } = await supabase
      .from('building_todos')
      .update({
        title: title?.trim(),
        description: description?.trim() || null,
        building_id: building_id || null,
        due_date: due_date || null,
        priority,
        assigned_to: assigned_to || null,
        status,
        is_complete: status === 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating todo:', error)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Task updated successfully',
      todo: data 
    })

  } catch (error) {
    console.error('Error in update-building-todo API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Delete the todo
    const { error } = await supabase
      .from('building_todos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting todo:', error)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Task deleted successfully'
    })

  } catch (error) {
    console.error('Error in delete-building-todo API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 