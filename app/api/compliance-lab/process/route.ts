import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const maxDuration = 300; // 5 minutes for full processing

export async function POST(req: NextRequest) {
  try {
    const { jobId, filePath, filename, mime, userId, category } = await req.json();

    if (!jobId || !filePath) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'jobId and filePath are required'
      }, { status: 400 });
    }

    console.log('🔄 Starting compliance document processing for job:', jobId);

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

    console.log('🔍 Starting OCR processing for compliance job:', jobId);

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
      console.error('❌ OCR processing failed for job:', jobId);
      await serviceSupabase
        .from('document_jobs')
        .update({
          status: 'FAILED',
          error_code: 'OCR_FAILED',
          error_message: 'OCR processing failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json({
        error: 'OCR processing failed',
        jobId
      }, { status: 500 });
    }

    const ocrResult = await ocrResponse.json();
    console.log('✅ OCR completed for compliance job:', jobId);

    // Update job status to EXTRACT
    await serviceSupabase
      .from('document_jobs')
      .update({
        status: 'EXTRACT',
        page_count: ocrResult.page_count,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('📄 Starting compliance document analysis for job:', jobId);

    // Call compliance analysis service
    const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/ai/analyze-compliance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: jobId,
        ocrText: ocrResult.text,
        filename: filename,
        pageCount: ocrResult.page_count,
        category: 'compliance'
      })
    });

    if (!analysisResponse.ok) {
      console.error('❌ Compliance analysis failed for job:', jobId);
      await serviceSupabase
        .from('document_jobs')
        .update({
          status: 'FAILED',
          error_code: 'ANALYSIS_FAILED',
          error_message: 'Compliance analysis failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json({
        error: 'Compliance analysis failed',
        jobId
      }, { status: 500 });
    }

    const analysisResult = await analysisResponse.json();
    console.log('✅ Compliance analysis completed for job:', jobId);

    // Update job status to READY with analysis results
    await serviceSupabase
      .from('document_jobs')
      .update({
        status: 'READY',
        doc_type_guess: analysisResult.document_type || 'compliance_document',
        summary_json: analysisResult.summary,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('🎉 Compliance document processing completed successfully for job:', jobId);

    return NextResponse.json({
      success: true,
      jobId,
      status: 'READY',
      document_type: analysisResult.document_type,
      summary: analysisResult.summary
    });

  } catch (error) {
    console.error('❌ Error in compliance document processing:', error);

    // Try to update job status to failed if we have jobId
    try {
      const { jobId } = await req.json();
      if (jobId) {
        const serviceSupabase = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await serviceSupabase
          .from('document_jobs')
          .update({
            status: 'FAILED',
            error_code: 'PROCESSING_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown processing error',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    } catch (updateError) {
      console.error('❌ Failed to update job status after error:', updateError);
    }

    return NextResponse.json({
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}