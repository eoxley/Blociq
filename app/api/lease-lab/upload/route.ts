import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to upload documents'
      }, { status: 401 });
    }

    const user = session.user;

    // For lease lab, we don't require agency membership
    // The system works directly with user authentication
    console.log('✅ User authenticated for lease lab upload');

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided',
        message: 'Please select a file to upload'
      }, { status: 400 });
    }

    // Server-side validation (tamper-proof)
    const maxSize = parseInt(process.env.DOC_REVIEW_MAX_MB || '50') * 1024 * 1024;
    const maxPages = parseInt(process.env.DOC_REVIEW_MAX_PAGES || '300');

    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large',
        message: "This file is too large to process reliably. Try compressing it, splitting into parts, or contact support."
      }, { status: 400 });
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type',
        message: "This file type isn't supported. Please upload a PDF or DOCX."
      }, { status: 400 });
    }

    // Create job record
    const jobData = {
      filename: file.name,
      status: 'QUEUED',
      size_bytes: file.size,
      mime: file.type,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      console.error('Job data attempted:', {
        filename: file.name,
        status: 'QUEUED',
        size_bytes: file.size,
        mime: file.type,
        user_id: user.id
      });
      return NextResponse.json({ 
        error: 'Failed to create job',
        message: 'Unable to create processing job. Please try again.',
        details: process.env.NODE_ENV === 'development' ? jobError.message : undefined
      }, { status: 500 });
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${job.id}.${fileExt}`;
    const filePath = `lease-lab/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('building_documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ 
        error: 'Upload failed',
        message: 'Failed to upload file. Please try again.'
      }, { status: 500 });
    }

    // Start background OCR processing (non-blocking)
    // This will be processed asynchronously to avoid timeout issues
    setTimeout(async () => {
      try {
        // Update job status to OCR
        await supabase
          .from('document_jobs')
          .update({ 
            status: 'OCR',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        console.log('🔍 Starting OCR processing for job:', job.id);

        // Call the real OCR service
        const ocrResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/ocr/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            storageKey: filePath,
            filename: file.name,
            mime: file.type,
            use_google_vision: true
          })
        });

        if (!ocrResponse.ok) {
          throw new Error(`OCR service failed: ${ocrResponse.status}`);
        }

        const ocrResult = await ocrResponse.json();
        console.log('✅ OCR completed:', ocrResult);

        // Update job status to EXTRACT
        await supabase
          .from('document_jobs')
          .update({ 
            status: 'EXTRACT',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Update job status to SUMMARISE
        await supabase
          .from('document_jobs')
          .update({ 
            status: 'SUMMARISE',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Store the extracted text for analysis
        await supabase
          .from('document_jobs')
          .update({ 
            extracted_text: ocrResult.text,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        console.log('📝 Starting AI analysis and summarisation...');

        // Call AI analysis service
        const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/lease-lab/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: job.id,
            extractedText: ocrResult.text,
            filename: file.name,
            mime: file.type
          })
        });

        if (!analysisResponse.ok) {
          throw new Error(`AI analysis failed: ${analysisResponse.status}`);
        }

        const analysisResult = await analysisResponse.json();
        console.log('✅ AI analysis completed:', analysisResult);

        // Update job as ready with real analysis
        await supabase
          .from('document_jobs')
          .update({ 
            status: 'READY',
            summary_json: analysisResult.summary,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        console.log('🎉 Document processing completed successfully');

      } catch (error) {
        console.error('❌ Error in document processing:', error);
        // Mark job as failed
        await supabase
          .from('document_jobs')
          .update({ 
            status: 'FAILED',
            error_message: error instanceof Error ? error.message : 'Processing failed. Please try again.',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }, 1000); // Start processing after 1 second

    return NextResponse.json({ 
      success: true,
      job: {
        id: job.id,
        filename: job.filename,
        status: job.status,
        size_bytes: job.size_bytes,
        mime: job.mime,
        created_at: job.created_at,
        updated_at: job.updated_at,
        user_id: job.user_id
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}
