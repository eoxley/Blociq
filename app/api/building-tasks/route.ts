import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('building_tasks')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching building tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tasks: data });

  } catch (error) {
    console.error('Building tasks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      buildingId, 
      task, 
      dueDate, 
      assignedTo, 
      priority = 'Medium',
      notes,
      createdBy 
    } = body;

    if (!buildingId || !task) {
      return NextResponse.json({ error: 'Building ID and task are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('building_tasks')
      .insert({
        building_id: buildingId,
        task,
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
        priority,
        notes: notes || null,
        created_by: createdBy || 'system',
        status: 'Not Started'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating building task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: data });

  } catch (error) {
    console.error('Building tasks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 