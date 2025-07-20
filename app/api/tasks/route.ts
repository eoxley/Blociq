import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { building_id, title, due_date, priority, is_complete } = body

    // Validate required fields
    if (!building_id || !title) {
      return NextResponse.json({ error: 'Building ID and title are required' }, { status: 400 })
    }

    // Insert the task
    const { data, error } = await supabase
      .from('building_todos')
      .insert({
        building_id: parseInt(building_id),
        title,
        due_date: due_date || null,
        priority: priority || 'Medium',
        is_complete: is_complete || false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json({ success: true, task: data })
  } catch (error) {
    console.error('Error in tasks API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('building_id')

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 })
    }

    // Fetch tasks for the building
    const { data, error } = await supabase
      .from('building_todos')
      .select('*')
      .eq('building_id', buildingId)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json({ tasks: data })
  } catch (error) {
    console.error('Error in tasks API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 