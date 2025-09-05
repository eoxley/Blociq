import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest, 
  { params }: { params: { jobId: string } }
) {
  console.log(`🔍 Checking status for job: ${params.jobId}`);
  
  try {
    // Get user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }
    
    const userId = user.id;
    
    // Get job details
    const { data: jobData, error: jobError } = await supabase
      .from('lease_processing_jobs')
      .select(`
        id,
        document_id,
        filename,
        file_size,
        file_type,
        building_id,
        status,
        priority,
        retry_count,
        max_retries,
        processing_started_at,
        processing_completed_at,
        processing_duration_ms,
        results,
        extracted_text,
        lease_analysis,
        ocr_source,
        error_message,
        error_details,
        last_error_at,
        notification_sent,
        notification_sent_at,
        created_at,
        updated_at
      `)
      .eq('id', params.jobId)
      .eq('user_id', userId) // Ensure user can only see their own jobs
      .single();
    
    if (jobError || !jobData) {
      console.error('❌ Job not found or access denied:', jobError);
      return NextResponse.json({ 
        success: false, 
        error: 'Job not found or access denied' 
      }, { status: 404 });
    }
    
    // Calculate progress and status information
    const statusInfo = calculateStatusInfo(jobData);
    
    // Get job history if requested
    const includeHistory = req.nextUrl.searchParams.get('includeHistory') === 'true';
    let history = null;
    
    if (includeHistory) {
      const { data: historyData } = await supabase
        .from('lease_processing_job_history')
        .select('previous_status, new_status, error_message, processing_notes, created_at, created_by')
        .eq('job_id', params.jobId)
        .order('created_at', { ascending: true });
      
      history = historyData || [];
    }
    
    // Build response based on job status
    const response: any = {
      success: true,
      jobId: jobData.id,
      documentId: jobData.document_id,
      filename: jobData.filename,
      status: jobData.status,
      ...statusInfo,
      metadata: {
        fileSize: jobData.file_size,
        fileType: jobData.file_type,
        buildingId: jobData.building_id,
        priority: jobData.priority,
        retryCount: jobData.retry_count,
        maxRetries: jobData.max_retries,
        createdAt: jobData.created_at,
        updatedAt: jobData.updated_at
      }
    };
    
    // Add processing details if available
    if (jobData.processing_started_at) {
      response.processingStartedAt = jobData.processing_started_at;
    }
    
    if (jobData.processing_completed_at) {
      response.processingCompletedAt = jobData.processing_completed_at;
      response.processingDuration = jobData.processing_duration_ms 
        ? Math.round(jobData.processing_duration_ms / 1000) + ' seconds'
        : null;
    }
    
    // Add results if completed
    if (jobData.status === 'completed') {
      response.results = {
        ocrSource: jobData.ocr_source,
        extractedTextLength: jobData.extracted_text?.length || 0,
        hasLeaseAnalysis: !!jobData.lease_analysis,
        notificationSent: jobData.notification_sent,
        notificationSentAt: jobData.notification_sent_at
      };
      
      // Include summary of lease analysis if available
      if (jobData.lease_analysis) {
        try {
          const analysis = typeof jobData.lease_analysis === 'string' 
            ? JSON.parse(jobData.lease_analysis) 
            : jobData.lease_analysis;
          
          response.results.analysisSummary = {
            confidence: analysis.confidence,
            summary: analysis.summary,
            clauseCount: analysis.clauses?.length || 0,
            keyTermsFound: Object.keys(analysis.keyTerms || {}).length
          };
        } catch (error) {
          console.warn('⚠️ Failed to parse lease analysis:', error);
        }
      }
    }
    
    // Add error details if failed
    if (jobData.status === 'failed') {
      response.error = {
        message: jobData.error_message,
        lastErrorAt: jobData.last_error_at,
        canRetry: jobData.retry_count < jobData.max_retries,
        retryCount: jobData.retry_count
      };
      
      if (jobData.error_details) {
        try {
          response.error.details = typeof jobData.error_details === 'string'
            ? JSON.parse(jobData.error_details)
            : jobData.error_details;
        } catch (error) {
          console.warn('⚠️ Failed to parse error details:', error);
        }
      }
    }
    
    // Include history if requested
    if (history) {
      response.history = history;
    }
    
    // Add helpful URLs
    response.urls = {
      results: jobData.status === 'completed' 
        ? `/api/lease-processing/results/${params.jobId}`
        : null,
      retry: jobData.status === 'failed' && jobData.retry_count < jobData.max_retries
        ? `/api/lease-processing/retry/${params.jobId}`
        : null
    };
    
    console.log(`✅ Status check complete for job ${params.jobId}: ${jobData.status}`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to calculate status info and progress
function calculateStatusInfo(jobData: any) {
  const now = new Date();
  const createdAt = new Date(jobData.created_at);
  const elapsedMs = now.getTime() - createdAt.getTime();
  
  switch (jobData.status) {
    case 'pending':
      return {
        progress: 0,
        message: 'Waiting in queue for processing',
        estimatedTimeRemaining: 'Unknown',
        statusColor: 'blue',
        isComplete: false
      };
      
    case 'processing':
      const processingStarted = jobData.processing_started_at 
        ? new Date(jobData.processing_started_at)
        : createdAt;
      const processingElapsed = now.getTime() - processingStarted.getTime();
      const progressPercent = Math.min(Math.round((processingElapsed / 300000) * 100), 95); // Assume 5min max, cap at 95%
      
      return {
        progress: progressPercent,
        message: 'Document is being processed...',
        estimatedTimeRemaining: processingElapsed > 300000 
          ? 'Should complete soon' 
          : Math.ceil((300000 - processingElapsed) / 60000) + ' minutes',
        statusColor: 'orange',
        isComplete: false
      };
      
    case 'completed':
      return {
        progress: 100,
        message: 'Processing completed successfully',
        completedAt: jobData.processing_completed_at,
        statusColor: 'green',
        isComplete: true
      };
      
    case 'failed':
      return {
        progress: 0,
        message: jobData.retry_count < jobData.max_retries 
          ? 'Processing failed - will retry automatically'
          : 'Processing failed - maximum retries reached',
        error: jobData.error_message,
        statusColor: 'red',
        isComplete: false,
        canRetry: jobData.retry_count < jobData.max_retries
      };
      
    case 'retrying':
      return {
        progress: 25,
        message: `Retrying processing (attempt ${jobData.retry_count + 1}/${jobData.max_retries})`,
        estimatedTimeRemaining: '5-10 minutes',
        statusColor: 'yellow',
        isComplete: false
      };
      
    default:
      return {
        progress: 0,
        message: `Unknown status: ${jobData.status}`,
        statusColor: 'gray',
        isComplete: false
      };
  }
}

// POST endpoint to manually retry failed jobs
export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  console.log(`🔄 Manual retry requested for job: ${params.jobId}`);
  
  try {
    // Get user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }
    
    const userId = user.id;
    
    // Check if job exists and belongs to user
    const { data: jobData, error: jobError } = await supabase
      .from('lease_processing_jobs')
      .select('id, status, retry_count, max_retries')
      .eq('id', params.jobId)
      .eq('user_id', userId)
      .single();
    
    if (jobError || !jobData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Job not found or access denied' 
      }, { status: 404 });
    }
    
    // Check if job can be retried
    if (jobData.status !== 'failed') {
      return NextResponse.json({ 
        success: false, 
        error: `Job cannot be retried. Current status: ${jobData.status}` 
      }, { status: 400 });
    }
    
    if (jobData.retry_count >= jobData.max_retries) {
      return NextResponse.json({ 
        success: false, 
        error: 'Maximum retry attempts reached' 
      }, { status: 400 });
    }
    
    // Reset job status for retry
    const { error: updateError } = await supabase
      .rpc('update_lease_job_status', {
        job_uuid: params.jobId,
        new_status: 'pending',
        processing_notes: `Manual retry requested by user`
      });
    
    if (updateError) {
      console.error('❌ Failed to reset job for retry:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to reset job for retry' 
      }, { status: 500 });
    }
    
    // Trigger background processor
    if (process.env.BACKGROUND_PROCESSOR_API_KEY) {
      try {
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/lease-processing/processor`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.BACKGROUND_PROCESSOR_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }).catch(error => {
          console.warn('⚠️ Failed to trigger background processor:', error);
        });
      } catch (error) {
        console.warn('⚠️ Background processor trigger failed:', error);
      }
    }
    
    console.log(`✅ Job ${params.jobId} reset for retry`);
    
    return NextResponse.json({
      success: true,
      message: 'Job has been reset and queued for retry',
      jobId: params.jobId,
      status: 'pending'
    });
    
  } catch (error) {
    console.error('❌ Manual retry error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}