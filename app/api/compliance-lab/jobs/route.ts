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

    // Fetch jobs for the user (try agency_id first, fallback to user_id)
    let jobs = [];
    let jobsError = null;

    // Try to get user's agency_id first
    const agencyId = user.user_metadata?.agency_id;

    if (agencyId) {
      console.log('🔍 Fetching jobs by agency_id:', agencyId);
      const { data, error } = await supabase
        .from('document_jobs')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('doc_category', 'compliance')
        .order('created_at', { ascending: false });

      jobs = data;
      jobsError = error;
    } else {
      console.log('🔍 No agency_id found, fetching jobs by user_id:', user.id);
      const { data, error } = await supabase
        .from('document_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('doc_category', 'compliance')
        .order('created_at', { ascending: false });

      jobs = data;
      jobsError = error;
    }

    if (jobsError) {
      console.error('Error fetching compliance jobs:', jobsError);

      // Check if it's a table not found error
      if (jobsError.message?.includes('relation') && jobsError.message?.includes('does not exist')) {
        console.log('📋 Document jobs table does not exist yet, returning empty array');
        return NextResponse.json({
          success: true,
          jobs: [],
          message: 'Document jobs table not set up yet. Upload a document to initialize.'
        });
      }

      return NextResponse.json({
        error: 'Failed to fetch jobs',
        message: 'Unable to retrieve compliance jobs. Please try again.',
        details: process.env.NODE_ENV === 'development' ? jobsError.message : undefined
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