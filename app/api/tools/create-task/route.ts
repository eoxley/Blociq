import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateTaskRequest {
  building_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: "Low" | "Medium" | "High";
  ai_log_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskRequest = await request.json();
    const { building_id, title, description, due_date, priority = "Medium", ai_log_id } = body;

    // Validate inputs
    if (!building_id) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    let result: any;
    let status: 'success' | 'error' = 'success';

    try {
      // Insert into building_todos
      const { data: task, error: insertError } = await supabase
        .from('building_todos')
        .insert({
          building_id,
          title,
          description,
          due_date,
          priority,
          status: 'Pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      result = task;

    } catch (error) {
      console.error('Error creating task:', error);
      status = 'error';
      result = { error: 'Failed to create task' };
    }

    // Log tool call
    await supabase.from('ai_tool_calls').insert({
      ai_log_id,
      tool_name: 'create_task',
      args: { building_id, title, description, due_date, priority },
      result,
      status
    });

    if (status === 'error') {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in create-task tool:', error);
    
    // Log error tool call
    try {
      await supabase.from('ai_tool_calls').insert({
        tool_name: 'create_task',
        args: { error: 'Request parsing failed' },
        result: { error: 'Internal server error' },
        status: 'error'
      });
    } catch (logError) {
      console.error('Error logging tool call:', logError);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
