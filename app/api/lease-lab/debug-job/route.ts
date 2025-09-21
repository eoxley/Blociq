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
        message: 'Please log in to debug jobs'
      }, { status: 401 });
    }

    const user = session.user;
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({
        error: 'Missing job ID',
        message: 'Please provide a jobId parameter'
      }, { status: 400 });
    }

    console.log('🔍 Debugging job:', jobId, 'for user:', user.id);

    // Get the job with all fields
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

    // Analyze the job data
    const debug = {
      jobInfo: {
        id: job.id,
        filename: job.filename,
        status: job.status,
        created_at: job.created_at,
        updated_at: job.updated_at
      },
      extractedText: {
        hasText: !!job.extracted_text,
        textLength: job.extracted_text?.length || 0,
        textPreview: job.extracted_text?.substring(0, 200) || null
      },
      analysis: {
        hasSummaryJson: !!job.summary_json,
        summaryType: typeof job.summary_json,
        summaryKeys: job.summary_json && typeof job.summary_json === 'object'
          ? Object.keys(job.summary_json)
          : [],
        summarySize: job.summary_json ? JSON.stringify(job.summary_json).length : 0,
        summaryPreview: job.summary_json && typeof job.summary_json === 'object'
          ? {
              hasExecutiveSummary: !!job.summary_json.executive_summary,
              hasBasicPropertyDetails: !!job.summary_json.basic_property_details,
              docType: job.summary_json.doc_type || null
            }
          : null
      },
      uiExpectations: {
        expectedFields: [
          'executive_summary',
          'basic_property_details.property_description',
          'basic_property_details.lease_term',
          'basic_property_details.parties'
        ],
        currentlyAvailable: job.summary_json && typeof job.summary_json === 'object'
          ? [
              job.summary_json.executive_summary ? 'executive_summary ✅' : 'executive_summary ❌',
              job.summary_json.basic_property_details?.property_description ? 'basic_property_details.property_description ✅' : 'basic_property_details.property_description ❌',
              job.summary_json.basic_property_details?.lease_term ? 'basic_property_details.lease_term ✅' : 'basic_property_details.lease_term ❌',
              job.summary_json.basic_property_details?.parties ? 'basic_property_details.parties ✅' : 'basic_property_details.parties ❌'
            ]
          : ['No summary_json available']
      }
    };

    return NextResponse.json({
      success: true,
      debug,
      rawSummaryJson: job.summary_json
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}