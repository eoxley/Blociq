import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Configure Next.js API route to handle large file uploads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for document processing

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to upload documents'
      }, { status: 401 });
    }

    const user = session.user;

    // For general lab, we don't require agency membership
    // The system works directly with user authentication
    console.log('✅ User authenticated for general lab upload');

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        error: 'No file provided',
        message: 'Please select a file to upload'
      }, { status: 400 });
    }

    // Server-side validation (tamper-proof)
    // Render supports larger file uploads than Vercel - we can be more generous
    const maxSize = parseInt(process.env.DOC_REVIEW_MAX_MB || '50') * 1024 * 1024;
    const maxPages = parseInt(process.env.DOC_REVIEW_MAX_PAGES || '300');

    if (file.size > maxSize) {
      const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      return NextResponse.json({
        error: 'File too large',
        message: `File size (${fileSizeMB}MB) exceeds the ${maxSizeMB}MB limit. Please compress the PDF or split it into smaller parts.`,
        maxSizeMB: maxSizeMB,
        fileSizeMB: fileSizeMB
      }, { status: 413 });
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
      doc_category: 'general',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      console.error('Error creating general document job:', jobError);
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
    const filePath = `general-lab/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('building_documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading general document file:', uploadError);
      return NextResponse.json({
        error: 'Upload failed',
        message: 'Failed to upload file. Please try again.'
      }, { status: 500 });
    }

    // Trigger background processing via separate API call
    // This ensures processing continues even after upload response is sent
    try {
      console.log('🔄 Triggering background processing for general document job:', job.id);

      // Make non-blocking call to processing endpoint
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/general-lab/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          filePath: filePath,
          filename: file.name,
          mime: file.type,
          userId: user.id
        })
      }).catch(error => {
        console.error('❌ Failed to trigger general document background processing:', error);
      });

    } catch (error) {
      console.error('❌ Error triggering general document background processing:', error);
    }

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
      },
      message: 'General document uploaded successfully'
    });

  } catch (error) {
    console.error('Unexpected error in general document upload:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}