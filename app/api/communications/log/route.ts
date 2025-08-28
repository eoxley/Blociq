import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { safeQuery, ensureRequiredTables } from '@/lib/database-setup';

export async function GET() {
  try {
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure required tables exist
    await ensureRequiredTables();

    // Fetch communications log with safe query
    const { data: logs, error, tableExists } = await safeQuery(
      'communications_log',
      () => supabase
        .from('communications_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
    );

    if (!tableExists) {
      console.log('📋 communications_log table not found, returning empty array');
      return NextResponse.json({ 
        data: [],
        success: true,
        message: 'No communications log table found - database may be empty'
      });
    }

    if (error) {
      console.error('Error fetching communications log:', error);
      return NextResponse.json({ 
        data: [],
        success: true,
        message: 'Error fetching communications log, returning empty array'
      });
    }

    return NextResponse.json({ 
      data: logs || [],
      success: true 
    });

  } catch (error: any) {
    console.error('Error in communications log API:', error);
    return NextResponse.json({ 
      data: [],
      success: true,
      message: 'Failed to fetch communications log, returning empty array'
    });
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

    // Ensure required tables exist
    await ensureRequiredTables();

    // Insert log entry with safe query
    const { data: log, error, tableExists } = await safeQuery(
      'communications_log',
      () => supabase
        .from('communications_log')
        .insert({
          action_type,
          template_id,
          building_name,
          created_from_ai: created_from_ai || false,
          ai_content: ai_content || null
        })
        .select()
        .single()
    );

    if (!tableExists) {
      console.log('📋 communications_log table not found, cannot log communication');
      return NextResponse.json({ 
        success: false,
        error: 'Communications log table not available',
        message: 'Database setup incomplete - cannot log communication'
      });
    }

    if (error) {
      console.error('Error inserting communications log:', error);
      return NextResponse.json({ 
        success: false,
        error: error.message,
        message: 'Failed to log communication'
      });
    }

    return NextResponse.json({ 
      data: log,
      success: true 
    });

  } catch (error: any) {
    console.error('Error in communications log API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create communications log entry',
        message: 'Database error occurred'
      },
      { status: 500 }
    );
  }
} 