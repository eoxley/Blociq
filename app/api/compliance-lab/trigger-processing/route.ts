import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60; // 1 minute for triggering

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to trigger processing'
      }, { status: 401 });
    }

    const user = session.user;
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({
        error: 'Missing job ID',
        message: 'Job ID is required'
      }, { status: 400 });
    }

    console.log('🔄 Manual trigger compliance processing for job:', jobId, 'by user:', user.id);

    // Get the job and verify it belongs to the user/agency
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('doc_category', 'compliance')
      .single();

    if (jobError || !job) {
      return NextResponse.json({
        error: 'Job not found',
        message: 'The job could not be found or you do not have permission to access it.'
      }, { status: 404 });
    }

    console.log('✅ Compliance job found:', {
      id: job.id,
      filename: job.filename,
      status: job.status,
      size: job.size_bytes
    });

    // Determine the file path based on job data
    const fileExt = job.filename.split('.').pop();
    const filePath = `compliance-lab/${job.id}.${fileExt}`;

    console.log('🔄 Calling compliance processing endpoint with path:', filePath);

    // Call the compliance processing endpoint directly
    const processingResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/compliance-lab/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: job.id,
        filePath: filePath,
        filename: job.filename,
        mime: job.mime,
        userId: user.id,
        category: 'compliance'
      })
    });

    console.log('📡 Compliance processing response status:', processingResponse.status);

    if (!processingResponse.ok) {
      const errorText = await processingResponse.text();
      console.error('❌ Compliance processing endpoint failed:', errorText);
      throw new Error(`Processing failed: ${processingResponse.status} - ${errorText}`);
    }

    const processingResult = await processingResponse.json();
    console.log('✅ Compliance processing triggered successfully:', processingResult);

    return NextResponse.json({
      success: true,
      message: 'Compliance processing triggered successfully',
      jobId: job.id,
      processingResult
    });

  } catch (error) {
    console.error('❌ Manual compliance trigger error:', error);
    return NextResponse.json({
      error: 'Failed to trigger compliance processing',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}