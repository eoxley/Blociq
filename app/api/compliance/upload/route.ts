import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';
import { validateComplianceFile, getFileTypeError, isValidMimeType, getMimeTypeFromFilename } from '@/lib/validation/mime';
import { extractTextFromPdfWithPageMap } from '@/lib/compliance/pdf-extractor';
import { 
  detectDocType, 
  extractFields, 
  computeDueDates, 
  toSummaryJson, 
  toCompliancePatch 
} from '@/lib/compliance/regexMap';

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
    let pageMap: Array<{ page: number; text: string }> = [];
    let summaryJson: any = null;
    let detectedDocType = docType; // Default to user-selected type
    let detectionScore = 0;

    if (mimeType === 'application/pdf') {
      try {
        console.log('📖 Extracting text from PDF...');
        const extractionResult = await extractTextFromPdfWithPageMap(Buffer.from(fileBuffer));
        extractedText = extractionResult.fullText;
        pageMap = extractionResult.pageMap;
        
        if (extractedText.trim()) {
          console.log(`✅ Extracted ${extractedText.length} characters from PDF`);
          
          // Detect document type using regex map
          console.log('🔍 Detecting document type...');
          const detection = detectDocType(pageMap);
          detectedDocType = detection.type;
          detectionScore = detection.score;
          
          console.log(`📋 Detected type: ${detectedDocType} (score: ${detectionScore})`);
          
          if (detection.type !== 'Unknown' && detection.score > 0.5) {
            // Extract fields using regex map
            console.log('🔍 Extracting fields...');
            const fields = extractFields(detection.type, pageMap);
            console.log('📊 Extracted fields:', fields);
            
            // Compute due dates
            console.log('📅 Computing due dates...');
            const due = computeDueDates(detection.type, fields);
            console.log('📅 Due dates:', due);
            
            // Generate summary JSON
            console.log('📋 Generating summary...');
            summaryJson = toSummaryJson(detection.type, fields, due);
            console.log('✅ Summary generated:', summaryJson);
          } else {
            console.log('⚠️ Could not determine document type automatically');
            summaryJson = {
              doc_type: 'assessment',
              assessment_type: docType,
              source_pages: pageMap.map(p => p.page),
              detection_failed: true
            };
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
      updated_at: new Date().toISOString(),
      doc_type: detectedDocType, // Update with detected type
      detection_score: detectionScore
    };

    if (extractedText) {
      updateData.extracted_text = extractedText;
    }

    if (pageMap.length > 0) {
      updateData.page_map = pageMap;
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

    // Update compliance assets if document was successfully parsed
    if (summaryJson && detectedDocType !== 'Unknown' && !summaryJson.detection_failed) {
      try {
        console.log('📋 Updating compliance assets...');
        
        // Generate compliance patch using regex map
        const fields = extractFields(detectedDocType, pageMap);
        const due = computeDueDates(detectedDocType, fields);
        const patch = toCompliancePatch(detectedDocType, fields, due);
        
        console.log('📋 Compliance patch:', patch);
        
        // Only update if we have an assessment type (not insurance)
        if (patch.assessment_type) {
          const { error: assetError } = await supabase
            .from('building_compliance_assets')
            .upsert({
              building_id: buildingId,
              asset_type: patch.assessment_type,
              last_inspected_at: patch.last_inspected_at,
              next_due_date: patch.next_due_date,
              status: patch.status || 'compliant',
              document_job_id: job.id,
              updated_at: new Date().toISOString(),
              ...patch // Include any additional fields from the patch
            }, {
              onConflict: 'building_id,asset_type'
            });

          if (assetError) {
            console.error('❌ Asset update failed:', assetError);
          } else {
            console.log('✅ Compliance asset updated');
          }
        } else {
          console.log('ℹ️ No compliance asset update needed (insurance or other non-assessment document)');
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
        doc_type: detectedDocType,
        original_doc_type: docType,
        detection_score: detectionScore,
        building_id: buildingId,
        summary_json: summaryJson
      },
      message: summaryJson && !summaryJson.detection_failed 
        ? `Document processed as ${detectedDocType} and compliance data updated` 
        : summaryJson?.detection_failed 
          ? 'Document uploaded but type could not be determined automatically'
          : 'Document uploaded successfully'
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