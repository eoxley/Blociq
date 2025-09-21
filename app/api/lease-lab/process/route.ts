import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const maxDuration = 300; // 5 minutes for full processing

export async function POST(req: NextRequest) {
  try {
    const { jobId, filePath, filename, mime, userId } = await req.json();

    if (!jobId || !filePath) {
      return NextResponse.json({ 
        error: 'Missing required parameters',
        message: 'jobId and filePath are required'
      }, { status: 400 });
    }

    console.log('🔄 Starting background processing for job:', jobId);

    // Use service role client for background processing
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update job status to OCR
    await serviceSupabase
      .from('document_jobs')
      .update({ 
        status: 'OCR',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('🔍 Starting OCR processing for job:', jobId);

    // Call the real OCR service
    const ocrResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/ocr/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storageKey: filePath,
        filename: filename,
        mime: mime,
        use_google_vision: true
      })
    });

    if (!ocrResponse.ok) {
      throw new Error(`OCR service failed: ${ocrResponse.status}`);
    }

    const ocrResult = await ocrResponse.json();
    console.log('✅ OCR completed:', ocrResult);

    // Update job status to EXTRACT
    await serviceSupabase
      .from('document_jobs')
      .update({ 
        status: 'EXTRACT',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Update job status to SUMMARISE
    await serviceSupabase
      .from('document_jobs')
      .update({ 
        status: 'SUMMARISE',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Store the extracted text for analysis
    await serviceSupabase
      .from('document_jobs')
      .update({ 
        extracted_text: ocrResult.text,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('📝 Starting AI analysis and summarisation...');

    // Call AI analysis service
    const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/lease-lab/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: jobId,
        extractedText: ocrResult.text,
        filename: filename,
        mime: mime,
        userId: userId
      })
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('❌ AI analysis failed:', {
        status: analysisResponse.status,
        error: errorText
      });
      throw new Error(`AI analysis failed: ${analysisResponse.status} - ${errorText}`);
    }

    const analysisResult = await analysisResponse.json();
    console.log('✅ AI analysis completed:', {
      success: analysisResult.success,
      hasAnalysis: !!analysisResult.summary,
      analysisLength: analysisResult.analysisLength || 0
    });

    // Update job status to READY (analysis endpoint already saved summary_json)
    const { error: statusUpdateError } = await serviceSupabase
      .from('document_jobs')
      .update({
        status: 'READY',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (statusUpdateError) {
      console.error('❌ Failed to update job status to READY:', statusUpdateError);
      throw new Error('Failed to update job status');
    }

    // Verify the analysis was saved correctly
    const { data: finalJob, error: verifyError } = await serviceSupabase
      .from('document_jobs')
      .select('id, status, summary_json')
      .eq('id', jobId)
      .single();

    if (verifyError) {
      console.error('❌ Failed to verify job after processing:', verifyError);
    } else {
      console.log('🔍 Final job verification:', {
        id: finalJob.id,
        status: finalJob.status,
        hasAnalysis: !!finalJob.summary_json,
        analysisKeys: finalJob.summary_json ? Object.keys(finalJob.summary_json).slice(0, 5) : []
      });
    }

    console.log('🎉 Document processing completed successfully');

    return NextResponse.json({
      success: true,
      jobId,
      status: 'READY'
    });

  } catch (error) {
    console.error('❌ Error in document processing:', error);
    
    // Mark job as failed if we have the jobId
    const body = await req.json().catch(() => ({}));
    if (body.jobId) {
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      await serviceSupabase
        .from('document_jobs')
        .update({ 
          status: 'FAILED',
          error_message: error instanceof Error ? error.message : 'Processing failed. Please try again.',
          updated_at: new Date().toISOString()
        })
        .eq('id', body.jobId);
    }

    return NextResponse.json({ 
      error: 'Processing failed',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}