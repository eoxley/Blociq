// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for suggestedAction, buildingId
// - Validation of suggested action structure
// - Supabase query with proper error handling
// - Try/catch with detailed error handling
// - Used in AI suggestion components

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

type SuggestedAction = {
  type: 'todo';
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date?: string | null;
  description?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { suggestedAction, buildingId } = await req.json();

    if (!suggestedAction || !buildingId) {
      return NextResponse.json(
        { error: 'Suggested action and building ID are required' },
        { status: 400 }
      );
    }

    // Validate suggested action structure
    if (suggestedAction.type !== 'todo' || !suggestedAction.title) {
      return NextResponse.json(
        { error: 'Invalid suggested action structure' },
        { status: 400 }
      );
    }

    const supabase = createClient(cookies());

    // Create the task in the building_todos table
    const { data: newTask, error } = await supabase
      .from('building_todos')
      .insert({
        building_id: buildingId,
        title: suggestedAction.title,
        priority: suggestedAction.priority || 'Medium',
        due_date: suggestedAction.due_date || null,
        is_complete: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task from suggestion:', error);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      task: newTask,
      message: 'Task created successfully from AI suggestion'
    });

  } catch (error) {
    console.error('Error in create-task-from-suggestion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 