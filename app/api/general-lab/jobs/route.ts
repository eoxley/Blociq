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

    // For general lab, we don't require agency membership
    // The system works directly with user authentication
    console.log('✅ User authenticated for general lab jobs');
    console.log('👤 User ID:', user.id);
    console.log('👤 User email:', user.email);

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Check if document_jobs table exists and fetch jobs for the user
    console.log('🔍 Querying general document jobs for user_id:', user.id);

    let jobs = [];
    let jobsError = null;

    try {
      const { data, error } = await supabase
        .from('document_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('doc_category', 'general')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      jobs = data;
      jobsError = error;
    } catch (tableError) {
      console.error('Document_jobs table may not exist:', tableError);
      return NextResponse.json({
        jobs: [],
        message: 'Jobs table not yet initialized'
      });
    }

    if (jobsError) {
      console.error('Error fetching general document jobs:', jobsError);

      // Check if it's a table not found error
      if (jobsError.message?.includes('relation') && jobsError.message?.includes('does not exist')) {
        console.log('📋 Document_jobs table does not exist yet, returning empty array');
        return NextResponse.json({
          jobs: [],
          message: 'Jobs table not yet initialized'
        });
      }

      return NextResponse.json({
        error: 'Failed to fetch jobs',
        message: 'Unable to retrieve jobs. Please try again.',
        details: process.env.NODE_ENV === 'development' ? jobsError.message : undefined
      }, { status: 500 });
    }

    console.log(`📋 Found ${jobs?.length || 0} general document jobs for user`);

    return NextResponse.json({
      success: true,
      jobs: jobs || [],
      page,
      limit,
      total: jobs?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in general document jobs:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}