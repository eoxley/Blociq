import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        status: 'unauthenticated'
      }, { status: 401 });
    }

    // Test 1: Check if we can query incoming_emails table
    const { data: emailsData, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('id, subject, building_id')
      .limit(5);

    if (emailsError) {
      return NextResponse.json({
        error: 'Failed to query incoming_emails table',
        details: emailsError.message,
        status: 'emails_query_failed'
      }, { status: 500 });
    }

    // Test 2: Check if we can query buildings table
    const { data: buildingsData, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name')
      .limit(5);

    if (buildingsError) {
      return NextResponse.json({
        error: 'Failed to query buildings table',
        details: buildingsError.message,
        status: 'buildings_query_failed'
      }, { status: 500 });
    }

    // Test 3: Test the join relationship
    const { data: joinData, error: joinError } = await supabase
      .from('incoming_emails')
      .select(`
        id,
        subject,
        building_id,
        buildings(name)
      `)
      .limit(5);

    if (joinError) {
      return NextResponse.json({
        error: 'Failed to join incoming_emails with buildings',
        details: joinError.message,
        status: 'join_failed',
        emailsCount: emailsData?.length || 0,
        buildingsCount: buildingsData?.length || 0
      }, { status: 500 });
    }

    // Test 4: Check table schemas
    const { data: emailsSchema, error: emailsSchemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'incoming_emails' })
      .single();

    const { data: buildingsSchema, error: buildingsSchemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'buildings' })
      .single();

    return NextResponse.json({
      success: true,
      status: 'all_tests_passed',
      results: {
        emails: {
          count: emailsData?.length || 0,
          sample: emailsData?.slice(0, 2) || [],
          schema: emailsSchemaError ? 'Schema query failed' : emailsSchema
        },
        buildings: {
          count: buildingsData?.length || 0,
          sample: buildingsData?.slice(0, 2) || [],
          schema: buildingsSchemaError ? 'Schema query failed' : buildingsSchema
        },
        join: {
          count: joinData?.length || 0,
          sample: joinData?.slice(0, 2) || []
        }
      },
      message: 'All relationship tests passed successfully'
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'internal_error'
    }, { status: 500 });
  }
} 