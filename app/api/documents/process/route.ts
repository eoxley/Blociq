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

    console.log('🔄 Starting document processing for job:', jobId, 'category:', category);

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
    console.log('✅ OCR completed for job:', jobId);

    // Update job status to CLASSIFY
    await serviceSupabase
      .from('document_jobs')
      .update({
        status: 'CLASSIFY',
        page_count: ocrResult.page_count,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('🔍 Starting document classification for job:', jobId);

    // Call document classification service
    const classifyResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/documents/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: filename,
        ocrText: ocrResult.text
      })
    });

    if (!classifyResponse.ok) {
      console.error('❌ Document classification failed for job:', jobId);
      await serviceSupabase
        .from('document_jobs')
        .update({
          status: 'FAILED',
          error_code: 'CLASSIFICATION_FAILED',
          error_message: 'Document classification failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json({
        error: 'Document classification failed',
        jobId
      }, { status: 500 });
    }

    const classificationResult = await classifyResponse.json();
    console.log('✅ Document classification completed for job:', jobId, 'category:', classificationResult.classification.category);

    // Update job status to EXTRACT
    await serviceSupabase
      .from('document_jobs')
      .update({
        status: 'EXTRACT',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('📄 Starting detailed analysis for job:', jobId);

    // Route to appropriate analysis endpoint based on classification
    let analysisEndpoint = '/api/ai/analyze-compliance'; // Default fallback

    switch (classificationResult.classification.category) {
      case 'compliance':
        analysisEndpoint = '/api/ai/analyze-compliance';
        break;
      case 'major_works':
        analysisEndpoint = '/api/ai/analyze-major-works';
        break;
      case 'general':
        analysisEndpoint = '/api/ai/analyze-general';
        break;
      default:
        console.warn('⚠️ Unknown document category, defaulting to compliance analysis');
        analysisEndpoint = '/api/ai/analyze-compliance';
    }

    // Call category-specific analysis service
    const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${analysisEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: jobId,
        ocrText: ocrResult.text,
        filename: filename,
        pageCount: ocrResult.page_count,
        category: classificationResult.classification.category,
        documentType: classificationResult.classification.document_type,
        stage: classificationResult.classification.stage
      })
    });

    if (!analysisResponse.ok) {
      console.error('❌ Document analysis failed for job:', jobId);
      await serviceSupabase
        .from('document_jobs')
        .update({
          status: 'FAILED',
          error_code: 'ANALYSIS_FAILED',
          error_message: 'Document analysis failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json({
        error: 'Document analysis failed',
        jobId
      }, { status: 500 });
    }

    const analysisResult = await analysisResponse.json();
    console.log('✅ Document analysis completed for job:', jobId);

    // Update job status to READY with analysis results
    await serviceSupabase
      .from('document_jobs')
      .update({
        status: 'READY',
        doc_type_guess: analysisResult.document_type || classificationResult.classification.document_type,
        summary_json: analysisResult.summary,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Log the analysis completion for audit trail
    try {
      await serviceSupabase
        .from('ai_analysis_logs')
        .insert({
          document_job_id: jobId,
          analysis_type: classificationResult.classification.category,
          classification_results: classificationResult.classification,
          analysis_results: analysisResult.summary,
          created_at: new Date().toISOString(),
          user_confirmed: false, // Will be updated when user confirms
          status: 'awaiting_confirmation'
        });
    } catch (logError) {
      console.warn('⚠️ Could not create analysis log:', logError.message);
    }

    console.log('🎉 Document processing completed successfully for job:', jobId);

    return NextResponse.json({
      success: true,
      jobId,
      status: 'READY',
      classification: classificationResult.classification,
      document_type: analysisResult.document_type,
      summary: analysisResult.summary
    });

  } catch (error) {
    console.error('❌ Error in document processing:', error);

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