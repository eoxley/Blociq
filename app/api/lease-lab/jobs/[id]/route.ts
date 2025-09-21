import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
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
    console.log('🗑️ Starting DELETE request for job:', params.id);

    const supabase = createClient(cookies());
    console.log('✅ Supabase client created');

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📋 Session check result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      sessionError: sessionError?.message || 'none'
    });

    if (sessionError || !session?.user) {
      console.error('❌ Authentication failed:', sessionError);
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to delete job'
      }, { status: 401 });
    }

    const user = session.user;

    // For lease lab, we don't require agency membership
    // The system works directly with user authentication
    console.log('✅ User authenticated for lease lab delete');
    console.log('👤 Current user ID:', user.id);
    console.log('👤 Current user email:', user.email);

    // First, check if the job exists and belongs to the user
    console.log('🔍 Checking if job exists:', params.id, 'for user:', user.id);
    const { data: existingJob, error: checkError } = await supabase
      .from('document_jobs')
      .select('id, user_id, filename')
      .eq('id', params.id)
      .single();

    if (checkError) {
      console.error('❌ Error checking job:', checkError);
      return NextResponse.json({ 
        error: 'Job not found',
        message: 'The job could not be found.'
      }, { status: 404 });
    }

    if (!existingJob) {
      console.error('❌ Job not found:', params.id);
      return NextResponse.json({ 
        error: 'Job not found',
        message: 'The job could not be found.'
      }, { status: 404 });
    }

    if (existingJob.user_id !== user.id) {
      console.error('❌ Job does not belong to user:', { jobUserId: existingJob.user_id, currentUserId: user.id });
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'You do not have permission to delete this job.'
      }, { status: 403 });
    }

    console.log('✅ Job found and belongs to user:', existingJob);
    console.log('🔍 Job user_id:', existingJob.user_id);
    console.log('🔍 Current user_id:', user.id);
    console.log('🔍 User IDs match:', existingJob.user_id === user.id);

    // Delete the job using service role client for proper permissions
    console.log('🗑️ Deleting job from database:', params.id, 'for user:', user.id);

    // Create service role client for deletion
    console.log('🔧 Creating service role client...');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      throw new Error('Missing Supabase configuration');
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ Service role client created');

    console.log('🗑️ Executing delete query with params:', {
      jobId: params.id,
      userId: user.id
    });

    const { error: deleteError, count } = await serviceSupabase
      .from('document_jobs')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Error deleting job:', deleteError);
      console.error('❌ Delete error details:', {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint
      });

      // Try alternative deletion approach with regular client
      console.log('🔄 Trying alternative deletion with regular client...');
      try {
        const { error: altDeleteError } = await supabase
          .from('document_jobs')
          .delete()
          .eq('id', params.id)
          .eq('user_id', user.id);

        if (altDeleteError) {
          console.error('❌ Alternative deletion also failed:', altDeleteError);
          return NextResponse.json({
            error: 'Failed to delete job',
            message: 'Unable to delete job. Please try again.',
            details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
          }, { status: 500 });
        }

        console.log('✅ Alternative deletion succeeded');
        return NextResponse.json({
          success: true,
          message: 'Job deleted successfully'
        });

      } catch (altError) {
        console.error('❌ Alternative deletion threw error:', altError);
        return NextResponse.json({
          error: 'Failed to delete job',
          message: 'Unable to delete job. Please try again.'
        }, { status: 500 });
      }
    }

    console.log('✅ Job successfully deleted from database. Rows affected:', count);
    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully',
      rowsAffected: count
    });

  } catch (error) {
    console.error('❌ Job delete error:', error);
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });

    return NextResponse.json({
      error: 'Failed to delete job',
      message: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development'
        ? (error instanceof Error ? error.message : 'Unknown error')
        : undefined
    }, { status: 500 });
  }
}
