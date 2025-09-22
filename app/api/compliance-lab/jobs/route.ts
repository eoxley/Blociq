import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to view jobs'
      }, { status: 401 });
    }

    const user = session.user;

    // Fetch jobs for the user's agency
    const { data: jobs, error: jobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('agency_id', user.user_metadata?.agency_id)
      .eq('doc_category', 'compliance')
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Error fetching compliance jobs:', jobsError);
      return NextResponse.json({
        error: 'Failed to fetch jobs',
        message: 'Unable to retrieve compliance jobs. Please try again.'
      }, { status: 500 });
    }

    console.log('📋 Compliance jobs fetched:', jobs?.length || 0, 'jobs');

    return NextResponse.json({
      success: true,
      jobs: jobs || []
    });

  } catch (error) {
    console.error('Error in compliance jobs API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}