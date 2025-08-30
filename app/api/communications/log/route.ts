import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch communications log
    const { data: logs, error } = await supabase
      .from('communications_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching communications log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: logs || [],
      success: true 
    });

  } catch (error: any) {
    console.error('Error in communications log API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communications log' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action_type, template_id, building_name, created_from_ai, ai_content } = body;

    if (!action_type) {
      return NextResponse.json({ error: 'Action type is required' }, { status: 400 });
    }

    // Insert log entry
    const { data: log, error } = await supabase
      .from('communications_log')
      .insert({
        action_type,
        template_id,
        building_name,
        created_from_ai: created_from_ai || false,
        ai_content: ai_content || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting communications log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: log,
      success: true 
    });

  } catch (error: any) {
    console.error('Error in communications log API:', error);
    return NextResponse.json(
      { error: 'Failed to create communications log entry' },
      { status: 500 }
    );
  }
} 