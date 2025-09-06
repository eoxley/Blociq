import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to view job details'
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
        message: 'Please join an agency to view job details'
      }, { status: 403 });
    }

    // Fetch the specific job
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('id', params.id)
      .eq('agency_id', agencyMember.agency_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ 
        error: 'Job not found',
        message: 'The requested job was not found or you do not have permission to view it.'
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      job
    });

  } catch (error) {
    console.error('Job fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch job',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to update job'
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
        message: 'Please join an agency to update job'
      }, { status: 403 });
    }

    const body = await req.json();
    const { linked_building_id, linked_unit_id } = body;

    // Update the job
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .update({
        linked_building_id,
        linked_unit_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('agency_id', agencyMember.agency_id)
      .select()
      .single();

    if (jobError) {
      console.error('Error updating job:', jobError);
      return NextResponse.json({ 
        error: 'Failed to update job',
        message: 'Unable to update job. Please try again.'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      job
    });

  } catch (error) {
    console.error('Job update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update job',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}
