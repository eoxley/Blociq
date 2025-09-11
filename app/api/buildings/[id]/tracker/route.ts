import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
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

    const buildingId = params.id;
    const url = new URL(request.url);
    const includeCompleted = url.searchParams.get('includeCompleted') === 'true';

    // Validate building ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(buildingId)) {
      return NextResponse.json(
        { error: 'Invalid building ID format' },
        { status: 400 }
      );
    }

    // Build query with optional completed filter
    let query = supabase
      .from('building_action_tracker')
      .select('*')
      .eq('building_id', buildingId)
      .order('due_date', { ascending: true, nullsLast: true })
      .order('created_at', { ascending: false });

    if (!includeCompleted) {
      query = query.eq('completed', false);
    }

    const { data: trackerItems, error } = await query;

    if (error) {
      console.error('Error fetching tracker items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tracker items' },
        { status: 500 }
      );
    }

    // Calculate item statistics
    const stats = {
      total: trackerItems.length,
      active: trackerItems.filter(item => !item.completed).length,
      completed: trackerItems.filter(item => item.completed).length,
      overdue: trackerItems.filter(item => 
        !item.completed && 
        item.due_date && 
        new Date(item.due_date) < new Date()
      ).length,
      dueSoon: trackerItems.filter(item => 
        !item.completed && 
        item.due_date && 
        new Date(item.due_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
        new Date(item.due_date) >= new Date()
      ).length
    };

    return NextResponse.json({
      success: true,
      data: trackerItems,
      stats
    });

  } catch (error) {
    console.error('Error in tracker GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const buildingId = params.id;
    const body = await request.json();

    // Validate building ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(buildingId)) {
      return NextResponse.json(
        { error: 'Invalid building ID format' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.item_text || typeof body.item_text !== 'string') {
      return NextResponse.json(
        { error: 'item_text is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate optional fields
    const allowedPriorities = ['low', 'medium', 'high'];
    const allowedSources = ['Manual', 'Meeting', 'Call', 'Email'];

    if (body.priority && !allowedPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    if (body.source && !allowedSources.includes(body.source)) {
      return NextResponse.json(
        { error: 'Invalid source value' },
        { status: 400 }
      );
    }

    // Validate due_date format if provided
    if (body.due_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.due_date)) {
        return NextResponse.json(
          { error: 'Invalid due_date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
    }

    // Create the tracker item
    const { data: newItem, error } = await supabase
      .from('building_action_tracker')
      .insert({
        building_id: buildingId,
        item_text: body.item_text.trim(),
        due_date: body.due_date || null,
        notes: body.notes?.trim() || null,
        priority: body.priority || 'medium',
        source: body.source || 'Manual',
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tracker item:', error);
      return NextResponse.json(
        { error: 'Failed to create tracker item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newItem
    }, { status: 201 });

  } catch (error) {
    console.error('Error in tracker POST endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}