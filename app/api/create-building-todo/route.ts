import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { building_id, title, description, due_date, assigned_to } = body

    // Validate required fields
    if (!building_id) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      )
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate building exists and user has access
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', building_id)
      .single()

    if (buildingError || !building) {
      return NextResponse.json(
        { error: 'Building not found or access denied' },
        { status: 404 }
      )
    }

    // Validate due_date format if provided
    let validatedDueDate = null
    if (due_date) {
      const date = new Date(due_date)
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid due date format' },
          { status: 400 }
        )
      }
      validatedDueDate = due_date
    }

    // Create the todo
    const { data: newTodo, error: insertError } = await supabase
      .from('building_todos')
      .insert({
        building_id,
        title: title.trim(),
        description: description?.trim() || null,
        due_date: validatedDueDate,
        assigned_to: assigned_to || null,
        created_by: session.user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating todo:', insertError)
      return NextResponse.json(
        { error: 'Failed to create todo' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Task added successfully',
        todo: newTodo 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error in create-building-todo API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 