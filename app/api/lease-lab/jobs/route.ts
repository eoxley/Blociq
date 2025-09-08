import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to view jobs'
      }, { status: 401 });
    }

    // Get or create a default agency for the user
    let { data: agencyMember } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    let agencyId = agencyMember?.agency_id;

    // If no agency membership, create a default agency for the user
    if (!agencyMember) {
      console.log('🔧 No agency membership found, creating default agency...');
      
      // First, check if there's a default agency
      const { data: defaultAgency } = await supabase
        .from('agencies')
        .select('id')
        .eq('slug', 'default')
        .single();

      if (defaultAgency) {
        agencyId = defaultAgency.id;
      } else {
        // Create a default agency
        const { data: newAgency, error: agencyError } = await supabase
          .from('agencies')
          .insert({
            name: 'Default Agency',
            slug: 'default',
            status: 'active'
          })
          .select('id')
          .single();

        if (agencyError) {
          console.error('Error creating default agency:', agencyError);
          return NextResponse.json({ 
            error: 'Failed to create default agency',
            message: 'Unable to set up your account. Please try again.'
          }, { status: 500 });
        }

        agencyId = newAgency.id;
      }
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Fetch jobs for the user's agency (or all jobs if no agency)
    let query = supabase
      .from('document_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Only filter by agency if we have one
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data: jobs, error: jobsError } = await query;

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
