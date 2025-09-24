import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const buildingId = params.id
    const { searchParams } = new URL(request.url)
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(buildingId)) {
      return NextResponse.json({ error: 'Invalid building ID format' }, { status: 400 })
    }

    // Build query for action tracker items - return empty if table doesn't exist
    try {
      let query = supabase
        .from('building_action_tracker')
        .select(`
          id,
          building_id,
          item_text,
          due_date,
          notes,
          completed,
          completed_at,
          priority,
          source,
          created_by,
          created_at,
          updated_at
        `)
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })

      // Filter by completion status if not including completed
      if (!includeCompleted) {
        query = query.eq('completed', false)
      }

      const { data: items, error: itemsError } = await query

      // If table doesn't exist or columns don't exist, return empty response
      if (itemsError && (itemsError.code === 'PGRST116' || itemsError.code === '42703')) {
        console.log('Tracker table or columns not found, returning empty response:', itemsError.message);
        return NextResponse.json({
          success: true,
          data: [],
          stats: {
            total: 0,
            active: 0,
            completed: 0,
            overdue: 0,
            dueSoon: 0
          }
        })
      }

      if (itemsError) {
        console.error('Error fetching tracker items:', itemsError)
        return NextResponse.json({ error: 'Failed to fetch tracker items' }, { status: 400 })
      }

      // Calculate statistics
      const today = new Date()
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

      const allItems = items || []
      const activeItems = allItems.filter(item => !item.completed)

      const stats = {
        total: allItems.length,
        active: activeItems.length,
        completed: allItems.filter(item => item.completed).length,
        overdue: activeItems.filter(item => {
          if (!item.due_date) return false
          return new Date(item.due_date) < today
        }).length,
        dueSoon: activeItems.filter(item => {
          if (!item.due_date) return false
          const dueDate = new Date(item.due_date)
          return dueDate >= today && dueDate <= threeDaysFromNow
        }).length
      }

      return NextResponse.json({
        success: true,
        data: items || [],
        stats
      })
    } catch (tableError) {
      // Table doesn't exist, return empty response
      return NextResponse.json({
        success: true,
        data: [],
        stats: {
          total: 0,
          active: 0,
          completed: 0,
          overdue: 0,
          dueSoon: 0
        }
      })
    }

  } catch (error) {
    console.error('Unexpected error in tracker endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const buildingId = params.id
    const body = await request.json()

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(buildingId)) {
      return NextResponse.json({ error: 'Invalid building ID format' }, { status: 400 })
    }

    const { item_text, due_date, notes, priority, source } = body

    if (!item_text || typeof item_text !== 'string') {
      return NextResponse.json({ error: 'item_text is required' }, { status: 400 })
    }

    // First verify user has access to this building via regular client (RLS check)
    const { data: buildingAccess, error: accessError } = await supabase
      .from('buildings')
      .select('id, agency_id')
      .eq('id', buildingId)
      .single()

    if (accessError || !buildingAccess) {
      console.error('User does not have access to building:', buildingId, accessError)
      return NextResponse.json({
        error: 'Access denied to this building'
      }, { status: 403 })
    }

    // Use service client for insert (bypasses RLS but we already checked permissions)
    const serviceClient = createServiceClient()
    const { data: newItem, error: createError } = await serviceClient
      .from('building_action_tracker')
      .insert({
        building_id: buildingId,
        item_text: item_text.trim(),
        due_date: due_date || null,
        notes: notes?.trim() || null,
        priority: priority || 'medium',
        source: source || 'Manual',
        completed: false,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    // If table doesn't exist or columns missing, return error indicating tracker not set up
    if (createError && (createError.code === 'PGRST116' || createError.code === '42703')) {
      return NextResponse.json({
        error: 'Action tracker not available for this building. Please contact support to enable this feature.'
      }, { status: 404 })
    }

    if (createError) {
      console.error('Error creating tracker item:', createError)
      console.error('Error details:', {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      })
      console.error('User ID:', user.id)
      console.error('Building ID:', buildingId)
      console.error('Request body:', { item_text, due_date, notes, priority, source })

      return NextResponse.json({
        error: 'Failed to create tracker item',
        details: createError.message,
        code: createError.code
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: newItem
    })

  } catch (error) {
    console.error('Unexpected error in tracker POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
