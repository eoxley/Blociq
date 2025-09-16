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

    // For lease lab, we don't require agency membership
    // The system works directly with user authentication
    console.log('✅ User authenticated for lease lab jobs');
    console.log('👤 User ID:', user.id);
    console.log('👤 User email:', user.email);

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Check if document_jobs table exists and fetch jobs for the user
    console.log('🔍 Querying jobs for user_id:', user.id);

    let jobs = [];
    let jobsError = null;

    try {
      const { data, error } = await supabase
        .from('document_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      jobs = data;
      jobsError = error;
    } catch (tableError) {
      console.error('Document_jobs table may not exist:', tableError);
      // Return empty array if table doesn't exist rather than error
      jobs = [];
      jobsError = null;
    }

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);

      // If it's a table not found error, return empty array instead of 500
      if (jobsError.code === 'PGRST106' || jobsError.message?.includes('does not exist')) {
        console.warn('Document_jobs table does not exist, returning empty array');
        jobs = [];
      } else {
        return NextResponse.json({
          error: 'Failed to fetch jobs',
          message: 'Unable to retrieve job list. Please try again.',
          details: jobsError.message
        }, { status: 500 });
      }
    }

    console.log('📋 Returning jobs from API:', jobs?.length || 0, 'jobs');
    console.log('📋 Job IDs from API:', jobs?.map(job => job.id) || []);
    console.log('📋 Job user_ids from API:', jobs?.map(job => job.user_id) || []);
    console.log('📋 Query user_id:', user.id);
    
    return NextResponse.json({ 
      success: true,
      jobs: jobs || [],
      pagination: {
        page,
        limit,
        total: jobs?.length || 0
      }
    });

  } catch (error) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch jobs',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}
