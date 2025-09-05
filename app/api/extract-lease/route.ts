import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { extractText } from "@/lib/extract-text";
import { extractLeaseHybrid } from "@/lib/extractors/leaseHybrid";
import { renderLeaseReport } from "@/lib/reports/leaseReport";

export const runtime = "nodejs";
export const preferredRegion = "fra1";

// Create Supabase client with service role for database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type');
    let file: File | null = null;
    let documentId: string | null = null;
    let buildingId: string | null = null;
    let unitId: string | null = null;
    let agencyId: string | null = null;

    if (contentType?.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData();
      file = formData.get('file') as File;
      buildingId = formData.get('buildingId') as string;
      unitId = formData.get('unitId') as string;
      agencyId = formData.get('agencyId') as string;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Validate file has non-zero content
      if (!file.size || file.size === 0) {
        console.warn('❌ Received file with zero size:', file.name);
        return NextResponse.json({
          error: 'File is empty or corrupted',
          details: 'The uploaded file appears to be empty. Please check the file and try again.'
        }, { status: 400 });
      }

      // Additional buffer validation - convert to buffer and check content
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          console.warn('❌ File ArrayBuffer is empty:', file.name);
          return NextResponse.json({
            error: 'File buffer is empty',
            details: 'The file content could not be read or is empty. Please verify the file is not corrupted.'
          }, { status: 400 });
        }
        
        console.log('✅ Lease extraction - File buffer validation passed:', {
          bufferSize: arrayBuffer.byteLength,
          expectedSize: file.size,
          matches: arrayBuffer.byteLength === file.size
        });
        
      } catch (bufferError) {
        console.error('❌ Failed to read file buffer for lease extraction:', bufferError);
        return NextResponse.json({
          error: 'Failed to read file content',
          details: 'Unable to read the file content. The file may be corrupted or in an unsupported format.'
        }, { status: 400 });
      }

      // Note: File size limits removed - large files are now handled via StorageKey flow in /api/ocr/process
      // This endpoint maintains compatibility for smaller files that can be processed directly
    } else {
      // Handle JSON request with document ID
      const body = await req.json();
      documentId = body.documentId;
      buildingId = body.buildingId;
      unitId = body.unitId;
      agencyId = body.agencyId;

      if (!documentId) {
        return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
      }

      // Load document from database
      const { data: docData, error: docError } = await supabase
        .from('building_documents')
        .select('file_path, file_name, building_id, unit_id')
        .eq('id', documentId)
        .single();

      if (docError || !docData) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // Download file from Supabase storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('generated')
        .download(docData.file_path);

      if (downloadError || !fileData) {
        return NextResponse.json({ error: 'Failed to download document' }, { status: 500 });
      }

      // Create File object from blob
      file = new File([fileData], docData.file_name, { type: 'application/pdf' });
      buildingId = buildingId || docData.building_id;
      unitId = unitId || docData.unit_id;
    }

    if (!file) {
      return NextResponse.json({ error: 'No file to process' }, { status: 400 });
    }

    console.log(`🔄 Processing lease document: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    // Step 1: Extract text using enhanced OCR (DocAI first if enabled)
    const startTime = Date.now();
    const { extractedText, source, textLength, metadata, pages } = await extractText(file);
    const ocrTime = Date.now() - startTime;

    if (!extractedText || textLength === 0) {
      return NextResponse.json({ 
        error: 'No text could be extracted from document',
        details: metadata?.errorDetails 
      }, { status: 500 });
    }

    console.log(`✅ OCR completed via ${source}: ${textLength} characters in ${ocrTime}ms`);

    // Step 2: Extract lease fields using hybrid parser
    const extractionStartTime = Date.now();
    const { fields, confidence, existingParserData } = await extractLeaseHybrid(extractedText, file.name);
    const extractionTime = Date.now() - extractionStartTime;

    console.log(`✅ Lease extraction completed in ${extractionTime}ms`);

    // Step 3: Persist to database if we have required data
    let persistenceResults: any = {};
    
    if (buildingId && agencyId) {
      try {
        // Update or insert lease data
        if (fields.term_start || fields.term_end || fields.term_years || fields.ground_rent_terms) {
          const leaseData = {
            building_id: buildingId,
            unit_id: unitId,
            agency_id: agencyId,
            doc_type: 'lease',
            doc_url: documentId ? `document:${documentId}` : null,
            ...(fields.term_start && { term_start: fields.term_start }),
            ...(fields.term_end && { term_end: fields.term_end }),
            ...(fields.term_years && { term_years: fields.term_years }),
            ...(fields.ground_rent_terms && { ground_rent_terms: fields.ground_rent_terms }),
            updated_at: new Date().toISOString()
          };

          const { data: leaseResult, error: leaseError } = await supabase
            .from('leases')
            .upsert(leaseData, { 
              onConflict: 'building_id,unit_id',
              ignoreDuplicates: false 
            })
            .select();

          if (leaseError) {
            console.error('Lease upsert error:', leaseError);
          } else {
            persistenceResults.lease = leaseResult;
            console.log('✅ Lease data persisted');
          }
        }

        // Update unit apportionments if we have service charge data
        if (fields.service_charge_percent && unitId) {
          const apportionmentData = {
            unit_id: unitId,
            agency_id: agencyId,
            service_charge_percent: fields.service_charge_percent,
            apportionment_type: fields.apportionment_basis || 'percentage',
            updated_at: new Date().toISOString()
          };

          const { data: apportionmentResult, error: apportionmentError } = await supabase
            .from('unit_apportionments')
            .upsert(apportionmentData, { 
              onConflict: 'unit_id',
              ignoreDuplicates: false 
            })
            .select();

          if (apportionmentError) {
            console.error('Apportionment upsert error:', apportionmentError);
          } else {
            persistenceResults.apportionment = apportionmentResult;
            console.log('✅ Unit apportionment data persisted');
          }
        }

        // Update building_documents.meta with extraction metadata
        if (documentId) {
          const metaData = {
            extractor: source,
            location: process.env.DOCUMENT_AI_LOCATION || 'unknown',
            confidence: confidence,
            extraction_time: ocrTime + extractionTime,
            text_length: textLength,
            extracted_at: new Date().toISOString()
          };

          const { error: metaError } = await supabase
            .from('building_documents')
            .update({ 
              meta: metaData,
              updated_at: new Date().toISOString() 
            })
            .eq('id', documentId);

          if (metaError) {
            console.error('Meta update error:', metaError);
          } else {
            console.log('✅ Document metadata updated');
          }
        }

      } catch (persistError) {
        console.error('Database persistence error:', persistError);
        persistenceResults.error = 'Database persistence failed';
      }
    }

    // Step 4: Generate lease report with citations
    const report = renderLeaseReport({ 
      fields, 
      text: extractedText,
      pages,
      confidence,
      disclaimer: "This report was generated using AI document analysis. Please verify all information with the original lease document."
    });

    const totalTime = Date.now() - startTime;
    console.log(`✅ Lease processing completed in ${totalTime}ms total`);

    // Return comprehensive results
    return NextResponse.json({
      success: true,
      source,
      textLength,
      processingTime: {
        ocr: ocrTime,
        extraction: extractionTime,
        total: totalTime
      },
      fields,
      confidence,
      report,
      persistence: persistenceResults,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        documentId,
        buildingId,
        unitId,
        agencyId
      }
    });

  } catch (error) {
    console.error('❌ Lease extraction error:', error);
    
    return NextResponse.json({
      error: 'Failed to process lease document',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Lease Document Extraction API',
    description: 'Extracts lease data using Document AI and persists structured fields',
    usage: {
      'POST (file upload)': 'Send multipart/form-data with file, buildingId, unitId, agencyId',
      'POST (document ID)': 'Send JSON with documentId, buildingId, unitId, agencyId'
    },
    features: [
      'Document AI OCR with fallbacks',
      'Hybrid lease field extraction',
      'Database persistence (leases, unit_apportionments, building_documents.meta)',
      'Formatted lease report generation',
      'Agency-aware data isolation'
    ],
    limits: {
      fileSize: 'No limits - large files processed via StorageKey flow',
      timeout: '60 seconds per OCR method'
    }
  });
}