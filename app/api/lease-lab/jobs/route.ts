import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient(await cookies());
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to view jobs'
      }, { status: 401 });
    }

    // Get the user's agency
    const { data: agencyMember } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (!agencyMember) {
      return NextResponse.json({ 
        error: 'Agency membership required',
        message: 'Please join an agency to view jobs'
      }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Fetch jobs for the user's agency
    const { data: jobs, error: jobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('agency_id', agencyMember.agency_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return NextResponse.json({ 
        error: 'Failed to fetch jobs',
        message: 'Unable to retrieve job list. Please try again.'
      }, { status: 500 });
    }

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
