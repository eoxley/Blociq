import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';
import { validateComplianceFile, getFileTypeError, isValidMimeType, getMimeTypeFromFilename } from '@/lib/validation/mime';
import { extractTextFromPdf } from '@/lib/compliance/pdf-extractor';
import { parseEICR } from '@/lib/compliance/eicr-parser';

export async function POST(req: NextRequest) {
  try {
    console.log('📄 Starting compliance document upload...');

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildingId = formData.get('building_id') as string;
    const docType = formData.get('doc_type') as string || 'EICR';

    if (!file) {
      return NextResponse.json({
        error: 'No file provided',
        message: 'Please select a file to upload'
      }, { status: 400 });
    }

    if (!buildingId) {
      return NextResponse.json({
        error: 'No building specified',
        message: 'Please select a building for this document'
      }, { status: 400 });
    }

    // Validate file type
    const validation = validateComplianceFile(file);
    if (!validation.valid) {
      return NextResponse.json({
        error: 'Invalid file type',
        message: validation.error
      }, { status: 400 });
    }

    // Determine MIME type (server-side validation)
    let mimeType = validation.mimeType!;
    const contentType = req.headers.get('content-type');
    
    if (!isValidMimeType(mimeType)) {
      // Try to derive from filename
      const derivedMime = getMimeTypeFromFilename(file.name);
      if (derivedMime) {
        mimeType = derivedMime;
      } else {
        return NextResponse.json({
          error: 'Invalid file type',
          message: getFileTypeError(mimeType, file.name)
        }, { status: 400 });
      }
    }

    console.log(`✅ File validated: ${file.name} (${mimeType})`);

    // Get service client for database operations
    const supabase = getServiceClient();

    // Get user from auth header or session
    const authHeader = req.headers.get('authorization');
    let userId: string;
    
    if (authHeader?.startsWith('Bearer ')) {
      // Extract user from JWT token
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return NextResponse.json({
          error: 'Authentication required',
          message: 'Please log in to upload documents'
        }, { status: 401 });
      }
      
      userId = user.id;
    } else {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to upload documents'
      }, { status: 401 });
    }

    // Get user's agency
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile?.agency_id) {
      return NextResponse.json({
        error: 'User not linked to agency',
        message: 'Please complete your profile setup'
      }, { status: 400 });
    }

    // Upload file to storage
    const fileBuffer = await file.arrayBuffer();
    const filePath = `compliance/${userProfile.agency_id}/${buildingId}/${Date.now()}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('building_documents')
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      return NextResponse.json({
        error: 'Upload failed',
        message: 'Failed to save file to storage'
      }, { status: 500 });
    }

    console.log(`✅ File uploaded to storage: ${filePath}`);

    // Create compliance document job
    const jobData = {
      agency_id: userProfile.agency_id,
      user_id: userId,
      building_id: buildingId,
      doc_type: docType,
      status: 'QUEUED',
      mime: mimeType,
      size_bytes: file.size,
      storage_path: filePath,
      filename: file.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: job, error: jobError } = await supabase
      .from('compliance_document_jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      console.error('❌ Job creation failed:', jobError);
      return NextResponse.json({
        error: 'Job creation failed',
        message: 'Failed to create processing job'
      }, { status: 500 });
    }

    console.log(`✅ Created job: ${job.id}`);

    // Process file based on type
    let extractedText = '';
    let summaryJson: any = null;

    if (mimeType === 'application/pdf') {
      try {
        console.log('📖 Extracting text from PDF...');
        extractedText = await extractTextFromPdf(Buffer.from(fileBuffer));
        
        if (extractedText.trim()) {
          console.log(`✅ Extracted ${extractedText.length} characters from PDF`);
          
          // Parse EICR if it's an EICR document
          if (docType === 'EICR') {
            console.log('🔍 Parsing EICR document...');
            summaryJson = parseEICR(extractedText);
            console.log('✅ EICR parsed:', summaryJson);
          }
        } else {
          console.log('⚠️ No text extracted from PDF');
        }
      } catch (error) {
        console.error('❌ Text extraction failed:', error);
        // Continue without text extraction
      }
    } else {
      console.log('📷 Image file - skipping text extraction');
    }

    // Update job with results
    const updateData: any = {
      status: extractedText ? 'READY' : 'FAILED',
      updated_at: new Date().toISOString()
    };

    if (extractedText) {
      updateData.extracted_text = extractedText;
    }

    if (summaryJson) {
      updateData.summary_json = summaryJson;
    }

    if (!extractedText) {
      updateData.error_message = "We couldn't read text from this PDF. If it's a scan, upload through Lease Lab for OCR.";
    }

    const { error: updateError } = await supabase
      .from('compliance_document_jobs')
      .update(updateData)
      .eq('id', job.id);

    if (updateError) {
      console.error('❌ Job update failed:', updateError);
    } else {
      console.log('✅ Job updated with results');
    }

    // If EICR was parsed, update compliance assets
    if (summaryJson && docType === 'EICR') {
      try {
        console.log('📋 Updating compliance assets...');
        
        const { error: assetError } = await supabase
          .from('building_compliance_assets')
          .upsert({
            building_id: buildingId,
            asset_type: 'EICR',
            last_inspected_at: summaryJson.inspection_date,
            next_due_date: summaryJson.next_due_date,
            status: summaryJson.result === 'satisfactory' ? 'compliant' : 'non_compliant',
            document_job_id: job.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'building_id,asset_type'
          });

        if (assetError) {
          console.error('❌ Asset update failed:', assetError);
        } else {
          console.log('✅ Compliance asset updated');
        }
      } catch (error) {
        console.error('❌ Asset update error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: updateData.status,
        filename: file.name,
        doc_type: docType,
        building_id: buildingId,
        summary_json: summaryJson
      },
      message: summaryJson ? 'Document processed and compliance data updated' : 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json({
      error: 'Upload failed',
      message: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}