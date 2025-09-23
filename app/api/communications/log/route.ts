import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication - Safe destructuring to prevent \"Right side of assignment cannot be destructured\" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const building_id = searchParams.get('building_id')
    const leaseholder_id = searchParams.get('leaseholder_id')
    const direction = searchParams.get('direction') // 'incoming', 'outgoing', or null for both
    const limit = parseInt(searchParams.get('limit') || '100')

    // Fetch communications log with safer column selection
    let query = supabase
      .from('communications_log')
      .select(`
        id,
        template_id,
        template_name,
        sent_by,
        sent_at,
        building_id,
        building_name,
        method,
        recipients,
        subject,
        body,
        status,
        error_message,
        metadata,
        action_type,
        created_from_ai,
        ai_content,
        direction,
        content,
        type,
        recipient_email,
        building:buildings(id, name, address)
      `)
      .order('sent_at', { ascending: false })
      .limit(limit)

    // Apply filters (skip leaseholder_id filter for now since column may not exist)
    if (building_id) {
      query = query.eq('building_id', building_id)
    }
    // Skip leaseholder_id filter temporarily due to schema migration issues
    // if (leaseholder_id) {
    //   query = query.eq('leaseholder_id', leaseholder_id)
    // }
    if (direction && (direction === 'incoming' || direction === 'outgoing')) {
      query = query.eq('direction', direction)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching communications log:', error);

      // If relationship queries fail, try a simple query without relationships
      console.log('Attempting fallback query without relationships...');
      const { data: fallbackLogs, error: fallbackError } = await supabase
        .from('communications_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      return NextResponse.json({
        communications: fallbackLogs || [],
        data: fallbackLogs || [],
        success: true,
        fallback: true
      });
    }

    return NextResponse.json({
      communications: logs || [],
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication - Safe destructuring to prevent \"Right side of assignment cannot be destructured\" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      building_id,
      leaseholder_id,
      direction,
      subject,
      body_content,
      metadata = {}
    } = body;

    if (!direction || (direction !== 'incoming' && direction !== 'outgoing')) {
      return NextResponse.json({
        error: 'Direction is required and must be either "incoming" or "outgoing"'
      }, { status: 400 });
    }

    if (!body_content) {
      return NextResponse.json({ error: 'Body content is required' }, { status: 400 });
    }

    // Insert log entry (skip leaseholder_id temporarily due to schema issues)
    const insertData: any = {
      building_id: building_id || null,
      sent_by: session.user.id,
      direction,
      subject: subject || null,
      content: body_content,
      metadata: metadata || {}
    };

    // Only include leaseholder_id if the column exists
    // if (leaseholder_id) {
    //   insertData.leaseholder_id = leaseholder_id;
    // }

    const { data: log, error } = await supabase
      .from('communications_log')
      .insert(insertData)
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