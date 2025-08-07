import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('building_id');

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    // Fetch AI logs for the building
    const { data: aiLogs, error } = await supabase
      .from('ai_logs')
      .select(`
        id,
        user_id,
        question,
        response,
        context_type,
        building_id,
        document_ids,
        leaseholder_id,
        email_thread_id,
        created_at,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching AI logs:', error);
      return NextResponse.json({ error: 'Failed to fetch AI history' }, { status: 500 });
    }

    // Transform the data to include user names
    const transformedLogs = aiLogs?.map(log => ({
      id: log.id,
      user_id: log.user_id,
      question: log.question,
      response: log.response,
      context_type: log.context_type,
      building_id: log.building_id,
      document_ids: log.document_ids || [],
      leaseholder_id: log.leaseholder_id,
      email_thread_id: log.email_thread_id,
      created_at: log.created_at,
      user_name: log.profiles?.full_name || log.profiles?.email || 'Unknown user'
    })) || [];

    return NextResponse.json({ 
      success: true,
      logs: transformedLogs,
      count: transformedLogs.length
    });

  } catch (error) {
    console.error('Error in ai-history route:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch AI history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 