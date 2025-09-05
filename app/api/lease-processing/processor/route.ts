import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes for background processing

// Initialize Supabase client for background processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for background processing
);

interface ProcessingJob {
  job_id: string;
  document_id: string;
  user_id: string;
  file_path: string;
  filename: string;
  file_size: number;
  file_type: string;
  building_id?: string;
  retry_count: number;
  created_at: string;
}

interface ProcessingResults {
  success: boolean;
  text?: string;
  source?: string;
  analysis?: any;
  error?: string;
  metadata?: any;
}

// Background job processor endpoint
export async function POST(req: NextRequest) {
  console.log('🔄 Background lease processor: Starting job processing cycle');
  
  try {
    // Authenticate the request (you might want to add API key authentication here)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - API key required' 
      }, { status: 401 });
    }
    
    const apiKey = authHeader.replace('Bearer ', '');
    if (apiKey !== process.env.BACKGROUND_PROCESSOR_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid API key' 
      }, { status: 401 });
    }

    // Get next job from queue
    const { data: jobs, error: jobError } = await supabase
      .rpc('get_next_lease_processing_job');
    
    if (jobError) {
      console.error('❌ Failed to get next job:', jobError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to retrieve job from queue',
        details: jobError.message 
      }, { status: 500 });
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('📭 No jobs in queue');
      return NextResponse.json({ 
        success: true, 
        message: 'No jobs in queue',
        processed: 0 
      });
    }
    
    const job: ProcessingJob = jobs[0];
    console.log(`🎯 Processing job ${job.job_id} for document ${job.filename}`);
    
    // Update job status to processing
    const { error: statusError } = await supabase
      .rpc('update_lease_job_status', {
        job_uuid: job.job_id,
        new_status: 'processing',
        processing_notes: `Started processing ${job.filename} (${(job.file_size / 1024 / 1024).toFixed(2)} MB)`
      });
    
    if (statusError) {
      console.error('❌ Failed to update job status:', statusError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update job status' 
      }, { status: 500 });
    }
    
    // Download file from Supabase storage
    console.log(`📥 Downloading file from: ${job.file_path}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(job.file_path);
    
    if (downloadError || !fileData) {
      console.error('❌ Failed to download file:', downloadError);
      await updateJobWithError(job.job_id, 'Failed to download file from storage', downloadError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to download file',
        jobId: job.job_id 
      }, { status: 500 });
    }
    
    // Convert blob to file for processing
    const file = new File([fileData], job.filename, { type: job.file_type });
    console.log(`📄 File prepared: ${file.name} (${file.size} bytes)`);
    
    // Process the document using existing OCR logic
    const processingResults = await processDocumentWithOCR(file);
    
    if (processingResults.success) {
      console.log(`✅ Successfully processed ${job.filename}`);
      
      // Analyze the extracted text for lease information
      const leaseAnalysis = await analyzeLease(processingResults.text || '', job.filename);
      
      // Update job with success results
      const { error: updateError } = await supabase
        .from('lease_processing_jobs')
        .update({
          status: 'completed',
          results: processingResults,
          extracted_text: processingResults.text,
          lease_analysis: leaseAnalysis,
          ocr_source: processingResults.source,
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.job_id);
      
      if (updateError) {
        console.error('❌ Failed to update job with results:', updateError);
      }
      
      // Send notification email
      await sendCompletionNotification(job, true, leaseAnalysis);
      
      return NextResponse.json({ 
        success: true, 
        jobId: job.job_id,
        filename: job.filename,
        extractedLength: processingResults.text?.length || 0,
        source: processingResults.source,
        processingTime: Date.now() - new Date(job.created_at).getTime()
      });
      
    } else {
      console.error(`❌ Failed to process ${job.filename}:`, processingResults.error);
      await updateJobWithError(job.job_id, processingResults.error || 'Processing failed', processingResults);
      return NextResponse.json({ 
        success: false, 
        error: processingResults.error,
        jobId: job.job_id 
      }, { status: 422 });
    }
    
  } catch (error) {
    console.error('❌ Background processor error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to process document with OCR (reusing existing logic)
async function processDocumentWithOCR(file: File): Promise<ProcessingResults> {
  const startTime = Date.now();
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB for external OCR
  const REQUEST_TIMEOUT = 580000; // 9.5 minutes
  
  console.log(`🔍 Processing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  
  // Try external OCR first (if file size allows)
  if (file.size <= MAX_FILE_SIZE) {
    try {
      console.log('📡 Trying external OCR service...');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ External OCR successful');
        return {
          success: true,
          text: result.text,
          source: 'external_ocr',
          metadata: {
            fileType: file.type,
            fileSize: file.size,
            processingTime: Date.now() - startTime,
            model: 'google_document_ai'
          }
        };
      } else {
        console.warn(`⚠️ External OCR failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ External OCR error:', error);
    }
  }
  
  // Fallback to OpenAI Vision API
  if (process.env.OPENAI_API_KEY && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
    try {
      console.log('🤖 Using OpenAI Vision API...');
      
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      const extractionPrompt = 'Extract all text from this document. Focus on lease terms, dates, names, addresses, rent amounts, and other important lease information. Return only the text content, preserving structure when possible.';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes for OpenAI
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: extractionPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${base64}`,
                  detail: 'high'
                }
              }
            ]
          }],
          max_tokens: 4000,
          temperature: 0
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        const extractedText = result.choices?.[0]?.message?.content || '';
        
        console.log(`✅ OpenAI Vision successful - extracted ${extractedText.length} characters`);
        
        return {
          success: true,
          text: extractedText,
          source: 'openai_vision',
          metadata: {
            fileType: file.type,
            fileSize: file.size,
            processingTime: Date.now() - startTime,
            model: 'gpt-4o'
          }
        };
      } else {
        const errorText = await response.text();
        console.error('❌ OpenAI Vision failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ OpenAI Vision error:', error);
    }
  }
  
  // If both methods fail
  const isLargeFile = file.size > 2 * 1024 * 1024;
  const errorMessage = isLargeFile 
    ? 'Large document processing failed. The document may be too complex or the format is not supported.'
    : 'Document processing failed. Please check the document format and try again.';
    
  return {
    success: false,
    error: errorMessage,
    metadata: {
      fileType: file.type,
      fileSize: file.size,
      isLargeFile,
      attemptedMethods: ['external_ocr', 'openai_vision']
    }
  };
}

// Helper function to analyze extracted text for lease information
async function analyzeLease(extractedText: string, filename: string): Promise<any> {
  if (!process.env.OPENAI_API_KEY || !extractedText) {
    return { 
      confidence: 0.1, 
      summary: 'No analysis available',
      clauses: []
    };
  }
  
  try {
    console.log('🔍 Analyzing lease content...');
    
    const analysisPrompt = `Analyze this lease document and extract key information in JSON format:

Document: ${filename}
Text: ${extractedText.substring(0, 4000)}...

Return a JSON object with:
{
  "confidence": 0.0-1.0,
  "summary": "Brief summary of the lease",
  "clauses": [
    {
      "term": "rent",
      "text": "extracted clause text",
      "value": "parsed value if applicable"
    }
  ],
  "keyTerms": {
    "monthlyRent": "amount",
    "tenantName": "name",
    "landlordName": "name",
    "propertyAddress": "address",
    "leaseStartDate": "date",
    "leaseEndDate": "date",
    "depositAmount": "amount"
  }
}`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 2000,
        temperature: 0,
        response_format: { type: 'json_object' }
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      const analysisText = result.choices?.[0]?.message?.content || '{}';
      
      try {
        const analysis = JSON.parse(analysisText);
        console.log('✅ Lease analysis completed');
        return analysis;
      } catch (parseError) {
        console.error('❌ Failed to parse lease analysis JSON:', parseError);
        return { 
          confidence: 0.5, 
          summary: `Analysis failed to parse for ${filename}`,
          clauses: [],
          error: 'JSON parse error'
        };
      }
    } else {
      console.error('❌ Lease analysis API failed:', response.status);
      return { 
        confidence: 0.3, 
        summary: `Could not analyze ${filename}`,
        clauses: []
      };
    }
  } catch (error) {
    console.error('❌ Lease analysis error:', error);
    return { 
      confidence: 0.2, 
      summary: `Analysis error for ${filename}`,
      clauses: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to update job with error status
async function updateJobWithError(jobId: string, errorMessage: string, errorDetails?: any) {
  const { error } = await supabase
    .rpc('update_lease_job_status', {
      job_uuid: jobId,
      new_status: 'failed',
      error_msg: errorMessage,
      processing_notes: `Processing failed: ${errorMessage}`
    });
  
  if (error) {
    console.error('❌ Failed to update job with error:', error);
  }
  
  // Also update the error details in the job record
  await supabase
    .from('lease_processing_jobs')
    .update({
      error_details: errorDetails,
      last_error_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Helper function to send completion notification
async function sendCompletionNotification(job: ProcessingJob, success: boolean, analysis?: any) {
  try {
    // Get user email from the job record or user profile
    let userEmail = '';
    
    if (job.user_id) {
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', job.user_id)
        .single();
      
      userEmail = userData?.email || '';
    }
    
    if (!userEmail) {
      console.warn('⚠️ No email found for notification');
      return;
    }
    
    const subject = success 
      ? `✅ Lease Analysis Complete: ${job.filename}`
      : `❌ Lease Analysis Failed: ${job.filename}`;
    
    const message = success 
      ? `Your lease document "${job.filename}" has been successfully analyzed. ${analysis?.summary || 'Analysis completed'}`
      : `Unfortunately, we couldn't process your lease document "${job.filename}". Please try uploading it again or contact support.`;
    
    // Update job to mark notification as sent
    await supabase
      .from('lease_processing_jobs')
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString(),
        user_email: userEmail
      })
      .eq('id', job.job_id);
    
    console.log(`📧 Notification prepared for ${userEmail}: ${subject}`);
    
    // TODO: Integrate with your email service (SendGrid, Resend, etc.)
    // For now, just log the notification
    
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
  }
}

// Health check endpoint for the background processor
export async function GET(req: NextRequest) {
  try {
    // Get processor statistics
    const { data: stats, error } = await supabase
      .rpc('get_lease_processing_stats', {
        user_uuid: null,
        hours_back: 24
      });
    
    if (error) {
      return NextResponse.json({ 
        status: 'error', 
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats: stats?.[0] || {},
      services: {
        supabase: 'connected',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        renderOCR: 'available'
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}