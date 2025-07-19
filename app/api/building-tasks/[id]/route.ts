import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface TaskUpdateData {
  task?: string;
  due_date?: string | null;
  assigned_to?: string | null;
  status?: 'Not Started' | 'In Progress' | 'Complete';
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  notes?: string | null;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      task, 
      dueDate, 
      assignedTo, 
      status, 
      priority,
      notes 
    } = body;

    const updateData: TaskUpdateData = {};
    
    if (task !== undefined) updateData.task = task;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (assignedTo !== undefined) updateData.assigned_to = assignedTo;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('building_tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating building task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: data });

  } catch (error) {
    console.error('Building task PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from('building_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting building task:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Building task DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 