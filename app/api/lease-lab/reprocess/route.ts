import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const maxDuration = 120; // 2 minutes for reprocessing

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to reprocess jobs'
      }, { status: 401 });
    }

    const user = session.user;
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({
        error: 'Missing job ID',
        message: 'Job ID is required for reprocessing'
      }, { status: 400 });
    }

    console.log('🔄 Reprocessing job:', jobId, 'for user:', user.id);

    // Get the job and verify it belongs to the user
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({
        error: 'Job not found',
        message: 'The job could not be found or you do not have permission to access it.'
      }, { status: 404 });
    }

    if (!job.extracted_text) {
      return NextResponse.json({
        error: 'No extracted text',
        message: 'This job cannot be reprocessed because it has no extracted text data.'
      }, { status: 400 });
    }

    console.log('✅ Job found with extracted text, calling analysis endpoint...');

    // Call the analysis endpoint
    const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/lease-lab/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: job.id,
        extractedText: job.extracted_text,
        filename: job.filename,
        mime: job.mime,
        userId: user.id
      })
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      throw new Error(`Analysis failed: ${analysisResponse.status} - ${errorText}`);
    }

    const analysisResult = await analysisResponse.json();
    console.log('✅ Analysis completed for reprocessed job:', jobId);

    return NextResponse.json({
      success: true,
      message: 'Job reprocessed successfully',
      jobId: job.id,
      hasAnalysis: !!analysisResult.summary
    });

  } catch (error) {
    console.error('❌ Reprocessing error:', error);
    return NextResponse.json({
      error: 'Reprocessing failed',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}