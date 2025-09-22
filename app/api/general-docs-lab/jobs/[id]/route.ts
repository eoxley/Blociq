import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const jobId = params.id;

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to update jobs'
      }, { status: 401 });
    }

    const user = session.user;
    const updateData = await req.json();

    // Update the job record
    const { data: job, error: updateError } = await supabase
      .from('document_jobs')
      .update({
        linked_building_id: updateData.linked_building_id,
        linked_unit_id: updateData.linked_unit_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('agency_id', user.user_metadata?.agency_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating general docs job:', updateError);
      return NextResponse.json({
        error: 'Failed to update job',
        message: 'Unable to update job. Please try again.'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      job: job
    });

  } catch (error) {
    console.error('Error in general docs job update API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}