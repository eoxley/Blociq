import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { validateLeaseDocument } from '@/ai/contracts/validateLeaseSummary';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to view job details'
      }, { status: 401 });
    }

    const user = session.user;

    // For lease lab, we don't require agency membership
    // The system works directly with user authentication
    console.log('✅ User authenticated for lease lab job fetch');

    // Fetch the specific job
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ 
        error: 'Job not found',
        message: 'The requested job was not found or you do not have permission to view it.'
      }, { status: 404 });
    }

    // Validate summary_json if present
    let validationResult = null;
    if (job.summary_json && job.status === 'READY') {
      try {
        validationResult = validateLeaseDocument(job.summary_json);
      } catch (validationError) {
        console.warn('Summary validation failed:', validationError);
        validationResult = {
          isValid: false,
          errors: [{ field: 'summary_json', message: 'Invalid contract format', severity: 'error' as const }],
          warnings: [],
          qualityScore: 0
        };
      }
    }

    return NextResponse.json({ 
      success: true,
      job: {
        ...job,
        validation: validationResult
      }
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
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to update job'
      }, { status: 401 });
    }

    const user = session.user;

    // For lease lab, we don't require agency membership
    // The system works directly with user authentication
    console.log('✅ User authenticated for lease lab job update');

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
      .eq('user_id', user.id)
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to delete job'
      }, { status: 401 });
    }

    const user = session.user;

    // For lease lab, we don't require agency membership
    // The system works directly with user authentication
    console.log('✅ User authenticated for lease lab delete');

    // Delete the job
    console.log('🗑️ Deleting job from database:', params.id, 'for user:', user.id);
    const { error: deleteError } = await supabase
      .from('document_jobs')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Error deleting job:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete job',
        message: 'Unable to delete job. Please try again.'
      }, { status: 500 });
    }

    console.log('✅ Job successfully deleted from database');
    return NextResponse.json({ 
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    console.error('Job delete error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete job',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}
