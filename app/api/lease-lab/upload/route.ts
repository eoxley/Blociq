import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to upload documents'
      }, { status: 401 });
    }

    // Get the user's agency
    const { data: agencyMember } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (!agencyMember) {
      return NextResponse.json({ 
        error: 'Agency membership required',
        message: 'Please join an agency to upload documents'
      }, { status: 403 });
    }

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
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .insert({
        filename: file.name,
        status: 'QUEUED',
        size_bytes: file.size,
        mime: file.type,
        user_id: user.id,
        agency_id: agencyMember.agency_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      console.error('Job data attempted:', {
        filename: file.name,
        status: 'QUEUED',
        size_bytes: file.size,
        mime: file.type,
        user_id: user.id,
        agency_id: agencyMember.agency_id
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

    // Enqueue background processing
    // In a real implementation, this would trigger the Render OCR worker
    // For now, we'll simulate the processing
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

        // Simulate OCR processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Update job status to EXTRACT
        await supabase
          .from('document_jobs')
          .update({ 
            status: 'EXTRACT',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Simulate extraction
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Update job status to SUMMARISE
        await supabase
          .from('document_jobs')
          .update({ 
            status: 'SUMMARISE',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Simulate summarisation
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create mock summary
        const mockSummary = {
          doc_type: 'lease',
          overview: 'This is a sample lease document containing standard lease terms and conditions.',
          parties: ['Landlord: ABC Property Ltd', 'Tenant: John Smith'],
          key_dates: [
            { title: 'Lease Start Date', date: '2024-01-01', description: 'Commencement of lease term' },
            { title: 'Lease End Date', date: '2026-12-31', description: 'End of lease term' }
          ],
          financials: [
            { title: 'Monthly Rent', amount: '£1,200', description: 'Payable monthly in advance' },
            { title: 'Deposit', amount: '£2,400', description: 'Two months rent as security deposit' }
          ],
          obligations: [
            { title: 'Maintenance', description: 'Tenant responsible for internal maintenance' },
            { title: 'Insurance', description: 'Tenant must maintain contents insurance' }
          ],
          restrictions: [
            { title: 'No Pets', description: 'Pets not allowed without written consent' },
            { title: 'No Smoking', description: 'No smoking in the property' }
          ],
          variations: [],
          actions: [
            { title: 'Review Insurance Requirements', description: 'Verify insurance coverage meets lease requirements' },
            { title: 'Schedule Property Inspection', description: 'Arrange pre-occupation inspection' }
          ],
          source_spans: [],
          unknowns: ['Some clauses may require legal review']
        };

        // Update job as ready
        await supabase
          .from('document_jobs')
          .update({ 
            status: 'READY',
            summary_json: mockSummary,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

      } catch (error) {
        console.error('Error in background processing:', error);
        // Mark job as failed
        await supabase
          .from('document_jobs')
          .update({ 
            status: 'FAILED',
            error_message: 'Processing failed. Please try again.',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }, 1000);

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
        user_id: job.user_id,
        agency_id: job.agency_id
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
