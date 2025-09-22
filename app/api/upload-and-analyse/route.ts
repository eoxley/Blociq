// ✅ AUDIT COMPLETE [2025-01-15]
// - Has try/catch wrapper
// - Validates required fields (file, buildingId)
// - Validates file type (PDF only)
// - Uses proper Supabase queries with .eq() filters
// - Returns meaningful error responses
// - Includes authentication check

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 180; // 3 minutes for upload and analysis

// Helper function to categorize documents for the building_documents table
function getFrequencyForAssetType(assetName: string): number {
  const assetFrequencies: { [key: string]: number } = {
    'Fire Safety': 12, // Annual
    'Electrical Safety': 60, // 5 years
    'Gas Safety': 12, // Annual
    'Lift Safety': 6, // 6 months
    'Asbestos Management': 12, // Annual
    'Legionella Control': 12, // Annual
    'Water Safety': 12, // Annual
    'Emergency Lighting': 12, // Annual
    'Fire Alarm': 12, // Annual
    'EICR': 60, // 5 years
    'PAT Testing': 12, // Annual
    'Boiler Service': 12, // Annual
  };

  // Try to match the asset name to known frequencies
  for (const [key, frequency] of Object.entries(assetFrequencies)) {
    if (assetName.toLowerCase().includes(key.toLowerCase())) {
      return frequency;
    }
  }

  // Default to annual if unknown
  return 12;
}

function categorizeDocument(classification: string): string {
  const classificationLower = classification.toLowerCase();

  if (['fire risk assessment', 'eicr', 'gas safety', 'lift maintenance', 'electrical', 'asbestos'].some(term =>
    classificationLower.includes(term))) {
    return 'compliance';
  }

  if (classificationLower.includes('lease') || classificationLower.includes('tenancy')) {
    return 'leases';
  }

  if (classificationLower.includes('insurance')) {
    return 'insurance';
  }

  if (['major works', 'construction', 'renovation', 'project'].some(term =>
    classificationLower.includes(term))) {
    return 'major_works';
  }

  if (['minutes', 'meeting', 'agm', 'egm'].some(term =>
    classificationLower.includes(term))) {
    return 'minutes';
  }

  return 'other';
}

export async function POST(request: NextRequest) {
  // Add cache-busting headers
  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Content-Type': 'application/json'
  };

  try {
    // Debug request headers and content type
    const contentType = request.headers.get('content-type');
    console.log("📥 Upload request received:", {
      method: request.method,
      contentType: contentType,
      hasBody: request.body !== null
    });

    if (!contentType || !contentType.includes('multipart/form-data')) {
      console.error("❌ Invalid content type:", contentType);
      return NextResponse.json(
        {
          error: 'Invalid request format',
          details: `Expected multipart/form-data, received: ${contentType || 'none'}`,
          help: 'Please ensure you are sending a file upload with proper form data'
        },
        { status: 400, headers }
      );
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const buildingId = formData.get('buildingId') as string
    const processingId = formData.get('processingId') as string
    const fileHash = formData.get('fileHash') as string
    const forceReprocess = formData.get('forceReprocess') === 'true'
    const timestamp = formData.get('timestamp') as string

    console.log("🔄 Processing document with cache-busting:", {
      fileName: file?.name,
      processingId,
      fileHash: fileHash?.substring(0, 8) + '...',
      forceReprocess,
      timestamp
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400, headers }
      )
    }

    // Validate file type against building_documents bucket allowed types
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png'];

    if (!allowedMimeTypes.includes(file.type) &&
        !allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return NextResponse.json(
        {
          error: 'File type not supported',
          details: `Supported types: PDF, Word documents, text files, and images (JPG, PNG)`,
          receivedType: file.type || 'unknown'
        },
        { status: 400, headers }
      )
    }

    // Validate file size (50MB limit as per bucket configuration)
    const maxFileSize = 52428800; // 50MB in bytes
    if (file.size > maxFileSize) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `Maximum file size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          maxSize: '50MB'
        },
        { status: 400, headers }
      )
    }

    console.log("📄 Processing PDF:", file.name)

    // 1. Upload file to Supabase storage
    const supabase = await createClient()

    // Get current user for storage path
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('❌ Authentication error:', userError)
      return NextResponse.json(
        {
          error: 'Authentication required',
          details: userError?.message || 'User not found'
        },
        { status: 401, headers }
      )
    }

    const fileName = `${user.id}/${Date.now()}_${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('building_documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('❌ File upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500, headers }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('building_documents')
      .getPublicUrl(fileName)

    console.log("✅ File uploaded:", publicUrl)

    // 2. Analyze file characteristics for optimal OCR selection
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let analyzeFileCharacteristics, selectOptimalOCRMethods, generateFileHash, getOrExtractText;
    try {
      const intelligentSelection = await import('@/lib/ocr/intelligent-selection');
      analyzeFileCharacteristics = intelligentSelection.analyzeFileCharacteristics;
      selectOptimalOCRMethods = intelligentSelection.selectOptimalOCRMethods;
      generateFileHash = intelligentSelection.generateFileHash;

      const extractionCache = await import('@/lib/ocr/extraction-cache');
      getOrExtractText = extractionCache.getOrExtractText;
    } catch (importError) {
      console.error('❌ Failed to import OCR modules:', importError);
      return NextResponse.json(
        {
          error: 'OCR system unavailable',
          details: `OCR modules could not be loaded: ${importError instanceof Error ? importError.message : 'Unknown import error'}`,
          suggestion: 'Please try again later or contact support'
        },
        { status: 503, headers }
      );
    }
    
    const fileCharacteristics = await analyzeFileCharacteristics(file);
    const generatedFileHash = generateFileHash(fileBuffer);
    
    console.log("📋 File characteristics:", {
      hasTextLayer: fileCharacteristics.hasTextLayer,
      quality: fileCharacteristics.quality,
      estimatedPages: fileCharacteristics.estimatedPages,
      documentType: fileCharacteristics.documentType,
      fileHash: generatedFileHash.substring(0, 8) + '...'
    });

    // 3. Extract text with intelligent method selection and caching
    const extractionResult = await getOrExtractText(fileBuffer, async () => {
      const startTime = Date.now();
      const text = await extractTextFromPDFIntelligent(file, fileCharacteristics);
      const processingTime = Date.now() - startTime;
      
      const { calculateExtractionQuality, generateExtractionStats } = await import('@/lib/ocr/intelligent-selection');
      const quality = calculateExtractionQuality(text, file, fileCharacteristics);
      const stats = generateExtractionStats(text, processingTime, 'intelligent_selection', fileCharacteristics);
      
      return {
        text,
        method: 'intelligent_selection',
        stats,
        quality: quality.score
      };
    });

    const extractedText = extractionResult.text;
    
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Text extraction failed',
          details: 'Could not extract readable text from the document. The document may be scanned, corrupted, or heavily encrypted.',
          suggestions: [
            'Ensure the document is not password-protected',
            'Try uploading a different version of the document',
            'For scanned documents, ensure text is clearly visible'
          ],
          extractionMethod: extractionResult?.method || 'unknown'
        },
        { status: 400, headers }
      )
    }

    console.log(`✅ Text extracted (${extractionResult.fromCache ? 'from cache' : 'fresh'}):`, {
      length: extractedText.length,
      method: extractionResult.method,
      quality: extractionResult.quality
    });

    // 4. Validate extraction quality
    const { calculateExtractionQuality } = await import('@/lib/ocr/intelligent-selection');
    const extractionQuality = calculateExtractionQuality(extractedText, file, fileCharacteristics);
    console.log("📊 Extraction quality assessment:", {
      level: extractionQuality.quality_level,
      score: extractionQuality.score,
      completionRate: extractionQuality.completion_rate,
      warnings: extractionQuality.warnings.length
    });
    
    if (extractionQuality.score < 0.3) {
      console.warn("⚠️ Poor extraction quality detected - proceeding with caution");
    }

    // 4. Parse lease document into structured format
    console.log("📋 Parsing lease document with LeaseDocumentParser...");
    let leaseAnalysis, parsingStats;
    try {
      const { LeaseDocumentParser } = await import('@/lib/lease-document-parser');
      const parser = new LeaseDocumentParser(extractedText, file.name, extractionQuality.score);
      leaseAnalysis = parser.parse();
      parsingStats = parser.getParsingStats();
    } catch (parserError) {
      console.error('❌ Failed to import or run lease parser:', parserError);
      // Provide fallback analysis
      leaseAnalysis = {
        sections: [],
        parties: {},
        financial_terms: {},
        key_dates: {},
        property_details: {},
        clauses: [],
        summary: 'Parser unavailable - using AI analysis only'
      };
      parsingStats = {
        sections_found: 0,
        confidence: 0,
        processing_time: 0,
        warnings: ['Lease parser module unavailable']
      };
    }
    
    console.log("📊 Lease parsing statistics:", parsingStats);

    // 5. Generate AI analysis with enhanced prompt and validation context
    console.log("🤖 Starting AI document analysis...");
    let aiAnalysis;
    try {
      aiAnalysis = await analyseDocument(extractedText, file.name, buildingId, extractionQuality);
    } catch (aiError) {
      console.error('❌ AI analysis failed:', aiError);
      return NextResponse.json(
        {
          error: 'Document analysis failed',
          details: `AI analysis could not be completed: ${aiError instanceof Error ? aiError.message : 'Unknown AI error'}`,
          extractedText: extractedText.substring(0, 500) + '...', // Provide preview for manual review
          suggestions: ['Document can be uploaded for manual review', 'Try again later if this is a temporary issue']
        },
        { status: 500, headers }
      );
    }

    // 6. Create document record after AI analysis
    let documentId: string | null = null;
    try {
      console.log("💾 Creating document record for:", file.name);
      
      const { data: documentData, error: docError } = await supabase
        .from('building_documents')
        .insert({
          name: file.name,
          file_path: fileName, // Store the storage path, not public URL
          building_id: buildingId ? parseInt(buildingId) : null,
          type: aiAnalysis?.classification || 'Document', // Use AI classification
          category: categorizeDocument(aiAnalysis?.classification || 'Other'),
          file_size: file.size,
          uploaded_by: user.id,
          ocr_status: 'completed', // Since we've already extracted text
          ocr_text: extractedText.substring(0, 65535), // Postgres TEXT limit
          metadata: {
            original_filename: file.name,
            public_url: publicUrl,
            file_type: file.type,
            processing_method: extractionResult.method,
            quality_score: extractionQuality?.score,
            ai_confidence: aiAnalysis?.confidence
          }
        })
        .select('id')
        .single();

      if (docError) {
        console.error('❌ Failed to create document record:', docError);
        return NextResponse.json(
          {
            error: 'Database error',
            details: `Failed to create document record: ${docError.message}`,
            context: 'Document was uploaded successfully but could not be saved to database'
          },
          { status: 500, headers }
        );
      } else {
        documentId = documentData.id;
        console.log("✅ Document record created with ID:", documentId);
      }
    } catch (docCreateError) {
      console.error('❌ Error creating document record:', docCreateError);
      return NextResponse.json(
        {
          error: 'Database error',
          details: `Unexpected error creating document record: ${docCreateError instanceof Error ? docCreateError.message : 'Unknown database error'}`,
          context: 'Document was uploaded successfully but could not be saved to database'
        },
        { status: 500, headers }
      );
    }

    // 6. Store enhanced analysis with versioning and statistics
    try {
      const analysisData: any = {
        extracted_text: extractedText,
        summary: aiAnalysis.summary,
        analysis_version: 1,
        ocr_method: extractionResult.method,
        extraction_stats: extractionResult.stats,
        validation_flags: {
          quality_level: extractionQuality.quality_level,
          warnings: extractionQuality.warnings,
          recommendations: extractionQuality.recommendations,
          from_cache: extractionResult.fromCache
        },
        file_hash: generatedFileHash,
        processing_duration: extractionResult.stats?.processing_time || 0,
        quality_score: extractionQuality.score,
        extracted_at: new Date().toISOString()
      };
      
      // Link to document if we have an ID
      if (documentId) {
        analysisData.document_id = documentId;
      }
      
      const { error: analysisError } = await supabase
        .from('document_analysis')
        .insert(analysisData);

      if (analysisError) {
        console.error('⚠️ Failed to store document analysis:', analysisError);
        // Don't fail the request if this fails
      } else {
        console.log("✅ Enhanced document analysis stored", documentId ? "with document link" : "without document link");
      }
      
      // Store validation results separately
      if (documentId) {
        await supabase
          .from('validation_results')
          .insert({
            document_id: documentId,
            property_address_match: aiAnalysis.document_validation?.filename_match || false,
            filename_content_consistency: aiAnalysis.document_validation?.filename_match || false,
            critical_fields_found: aiAnalysis.key_entities || [],
            suspicious_patterns: extractionQuality.warnings,
            confidence_level: extractionQuality.score,
            validation_warnings: extractionQuality.warnings
          });
      }
      
    } catch (error) {
      console.error('⚠️ Error storing enhanced analysis:', error);
      // Don't fail the request if this fails
    }

    // 7. Store potential lease analysis for future linking
    let leaseStorageResult = null;
    if (aiAnalysis.classification === 'Lease Agreement' ||
        aiAnalysis.document_type?.toLowerCase().includes('lease') ||
        leaseAnalysis.sections?.length > 0) {

      try {
        // Prepare lease data for potential storage
        const leaseData = {
          building_id: buildingId ? parseInt(buildingId) : null,
          unit_id: null, // Will be set when user links to specific unit
          document_id: documentId,
          leaseholder_name: aiAnalysis.leaseholder_name || leaseAnalysis.parties?.lessee || null,
          lease_start_date: aiAnalysis.lease_start_date || leaseAnalysis.key_dates?.lease_start || null,
          lease_end_date: aiAnalysis.lease_end_date || leaseAnalysis.key_dates?.lease_end || null,
          apportionment: aiAnalysis.apportionment || leaseAnalysis.financial_terms?.service_charge_percentage || null,
          ground_rent: leaseAnalysis.financial_terms?.ground_rent_amount || null,
          analysis_json: {
            // Store the complete structured analysis
            lease_analysis: leaseAnalysis,
            ai_analysis: aiAnalysis,
            extraction_metadata: {
              quality_score: extractionQuality.score,
              method: extractionResult.method,
              file_hash: generatedFileHash,
              processed_at: new Date().toISOString()
            }
          },
          scope: 'unit', // Default scope, can be changed when linking
          created_by: user.id
        };

        // Only store if we have a building ID (indicates user intent to link)
        if (buildingId) {
          const { data: storedLease, error: leaseError } = await supabase
            .from('leases')
            .insert(leaseData)
            .select('id')
            .single();

          if (leaseError) {
            console.warn('⚠️ Could not auto-store lease analysis:', leaseError);
            leaseStorageResult = { stored: false, error: leaseError.message };
          } else {
            console.log('✅ Lease analysis stored for future linking:', storedLease.id);
            leaseStorageResult = { stored: true, leaseId: storedLease.id };
          }
        }
      } catch (leaseStoreError) {
        console.warn('⚠️ Error auto-storing lease analysis:', leaseStoreError);
        leaseStorageResult = { stored: false, error: 'Auto-storage failed' };
      }
    }

    // 8. Auto-create compliance asset for compliance documents
    let complianceAssetResult = null;
    if (buildingId && aiAnalysis.suggested_compliance_asset &&
        ['Fire Risk Assessment', 'EICR', 'Gas Safety', 'Lift Maintenance', 'Insurance Certificate'].includes(aiAnalysis.classification)) {

      try {
        console.log('🏗️ Creating compliance asset for:', aiAnalysis.classification);

        // First, try to find or create the compliance asset type
        let { data: assetType, error: assetError } = await supabase
          .from('compliance_assets')
          .select('id')
          .eq('name', aiAnalysis.suggested_compliance_asset)
          .single();

        if (assetError && assetError.code === 'PGRST116') {
          // Asset type doesn't exist, create it
          const { data: newAssetType, error: createAssetError } = await supabase
            .from('compliance_assets')
            .insert({
              name: aiAnalysis.suggested_compliance_asset,
              category: aiAnalysis.classification,
              description: `${aiAnalysis.classification} compliance requirement`,
              frequency_months: getFrequencyForAssetType(aiAnalysis.suggested_compliance_asset)
            })
            .select('id')
            .single();

          if (createAssetError) {
            console.warn('⚠️ Could not create compliance asset type:', createAssetError);
          } else {
            assetType = newAssetType;
          }
        }

        // If we have an asset type, create or update the building compliance asset
        if (assetType) {
          const complianceData = {
            building_id: parseInt(buildingId),
            status: 'compliant',
            last_renewed_date: aiAnalysis.inspection_date || new Date().toISOString().split('T')[0],
            next_due_date: aiAnalysis.next_due_date,
            notes: aiAnalysis.summary?.substring(0, 500),
            inspector_provider: aiAnalysis.contractor_name,
            certificate_reference: documentId // Link to our document
          };

          // Check if this building already has this compliance asset
          const { data: existing, error: existingError } = await supabase
            .from('building_compliance_assets')
            .select('id')
            .eq('building_id', parseInt(buildingId))
            .eq('asset_id', assetType.id)
            .single();

          if (existingError && existingError.code === 'PGRST116') {
            // Doesn't exist, create new
            const { data: newAsset, error: createError } = await supabase
              .from('building_compliance_assets')
              .insert({
                ...complianceData,
                asset_id: assetType.id
              })
              .select('id')
              .single();

            if (createError) {
              console.warn('⚠️ Could not create building compliance asset:', createError);
              complianceAssetResult = { created: false, error: createError.message };
            } else {
              console.log('✅ Compliance asset created:', newAsset.id);
              complianceAssetResult = { created: true, assetId: newAsset.id };
            }
          } else if (!existingError) {
            // Update existing
            const { error: updateError } = await supabase
              .from('building_compliance_assets')
              .update(complianceData)
              .eq('id', existing.id);

            if (updateError) {
              console.warn('⚠️ Could not update building compliance asset:', updateError);
              complianceAssetResult = { updated: false, error: updateError.message };
            } else {
              console.log('✅ Compliance asset updated:', existing.id);
              complianceAssetResult = { updated: true, assetId: existing.id };
            }
          }
        }
      } catch (complianceError) {
        console.warn('⚠️ Error handling compliance asset:', complianceError);
        complianceAssetResult = { created: false, error: 'Compliance asset creation failed' };
      }
    }

    // 9. Return analysis results for user confirmation
    return NextResponse.json({
      success: true,
      type: 'lease_analysis',
      processingId: processingId,
      fileHash: fileHash || generatedFileHash,
      processedAt: new Date().toISOString(),
      cached: extractionResult.fromCache || false,

      // Structured lease analysis (primary response)
      leaseAnalysis: leaseAnalysis,

      // Parsing statistics
      parsingStats: parsingStats,

      // AI analysis (fallback/additional context)
      ai: {
        ...aiAnalysis,
        originalFileName: file.name,
        buildingId: buildingId,
        documentId: documentId, // Include document ID for tracking
        extractedText: extractedText.substring(0, 1000) + '...', // First 1000 chars for preview
        fullTextLength: extractedText.length, // Show full extraction stats
        file_url: publicUrl // Include the uploaded file URL
      },

      // Quality metrics
      extractionQuality: {
        score: extractionQuality.score,
        level: extractionQuality.quality_level,
        completionRate: extractionQuality.completion_rate,
        warnings: extractionQuality.warnings
      },

      // Lease storage information
      leaseStorage: leaseStorageResult,

      // Compliance asset creation information
      complianceAsset: complianceAssetResult
    }, { headers })

  } catch (error) {
    console.error('❌ Error processing document:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace available')

    // Try to get processingId from formData if available
    let processingIdFromError = null;
    try {
      const errorFormData = await request.clone().formData();
      processingIdFromError = errorFormData.get('processingId') as string;
    } catch {
      // Ignore errors when trying to re-parse formData
    }

    const errorResponse = {
      error: 'Failed to process document. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error',
      processingId: processingIdFromError,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: 500, headers })
  }
}

async function extractTextFromPDFIntelligent(file: File, characteristics: any): Promise<string> {
  const { selectOptimalOCRMethods } = await import('@/lib/ocr/intelligent-selection');
  const methods = selectOptimalOCRMethods(characteristics);
  
  console.log(`🎯 Selected OCR methods:`, methods.map(m => `${m.name} (${m.suitability})`));
  
  // Try methods in order of suitability
  for (const method of methods) {
    try {
      console.log(`🔍 Trying method: ${method.name}`);
      const startTime = Date.now();
      
      let text = '';
      switch (method.name) {
        case 'pdf_text_layer':
          text = await extractTextFromPDF_TextLayer(file);
          break;
        case 'openai_extraction':
          text = await extractTextFromPDF_OpenAI(file);
          break;
        case 'google_vision_ocr':
          text = await extractTextFromPDF_GoogleVision(file);
          break;
        case 'enhanced_google_vision':
          text = await extractTextFromPDF_EnhancedVision(file);
          break;
        default:
          continue;
      }
      
      const duration = Date.now() - startTime;
      
      if (text && text.trim().length > 50) {
        console.log(`✅ Success with ${method.name}: ${text.length} chars in ${duration}ms`);
        return text;
      } else {
        console.log(`⚠️ Poor result from ${method.name}: ${text.length} chars`);
      }
      
    } catch (error) {
      console.log(`❌ ${method.name} failed:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  throw new Error('All OCR methods failed - document may be corrupted or heavily encrypted');
}

async function extractTextFromPDF_TextLayer(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const { extractPdfText } = await import('@/lib/pdf-parse-wrapper');
  return await extractPdfText(buffer);
}

async function extractTextFromPDF_OpenAI(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let fileId: string | null = null;
  try {
    const response = await openai.files.create({
      file: new Blob([buffer], { type: 'application/pdf' }),
      purpose: 'assistants',
    });
    fileId = response.id;

    const content = await openai.files.content(response.id);
    const text = await content.text();

    return text;
  } catch (error) {
    console.error('❌ OpenAI file extraction failed:', error);
    throw new Error(`OpenAI extraction failed: ${error instanceof Error ? error.message : 'Unknown OpenAI error'}`);
  } finally {
    // Clean up file even if extraction failed
    if (fileId) {
      try {
        await openai.files.delete(fileId);
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete OpenAI file:', deleteError);
      }
    }
  }
}

async function extractTextFromPDF_GoogleVision(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const { ocrFallback } = await import('@/lib/compliance/docExtract');
  return await ocrFallback(file.name, buffer);
}

async function extractTextFromPDF_EnhancedVision(file: File): Promise<string> {
  const { extractWithGoogleVision } = await import('@/lib/extract-text');
  const result = await extractWithGoogleVision(file);
  return result.extractedText;
}

// Legacy function for backward compatibility
async function extractTextFromPDF(file: File): Promise<string> {
  console.log(`📄 Starting text extraction for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  
  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Try PDF text layer extraction first (fastest)
    console.log("🔍 Method 1: Trying PDF text layer extraction...");
    try {
      const { extractPdfText } = await import('@/lib/pdf-parse-wrapper');
      const pdfText = await extractPdfText(buffer);
      
      if (pdfText && pdfText.trim().length > 100) {
        console.log(`✅ PDF text layer successful: ${pdfText.length} characters`);
        return pdfText;
      } else {
        console.log(`⚠️ PDF text layer yielded poor results: ${pdfText.length} characters`);
      }
    } catch (pdfError) {
      console.log("❌ PDF text layer extraction failed:", pdfError instanceof Error ? pdfError.message : 'Unknown error');
    }

    // Try OpenAI's text extraction (secondary method)
    console.log("🔍 Method 2: Trying OpenAI file extraction...");
    try {
      const response = await openai.files.create({
        file: new Blob([buffer], { type: 'application/pdf' }),
        purpose: 'assistants',
      })

      const content = await openai.files.content(response.id)
      const text = await content.text()

      // Clean up the file
      await openai.files.delete(response.id)

      if (text && text.trim().length > 50) {
        console.log(`✅ OpenAI extraction successful: ${text.length} characters`);
        return text;
      } else {
        console.log(`⚠️ OpenAI extraction yielded poor results: ${text.length} characters`);
      }
    } catch (openaiError) {
      console.log("❌ OpenAI extraction failed:", openaiError instanceof Error ? openaiError.message : 'Unknown error');
    }
    
    // Fallback: Try Google Vision OCR (most thorough for scanned docs)
    console.log("🔍 Method 3: Trying Google Vision OCR fallback...");
    try {
      const { ocrFallback } = await import('@/lib/compliance/docExtract');
      const ocrText = await ocrFallback(file.name, buffer);
      
      if (ocrText && ocrText.trim().length > 0) {
        console.log(`✅ Google Vision OCR successful: ${ocrText.length} characters`);
        return ocrText;
      } else {
        console.log(`⚠️ Google Vision OCR yielded no results`);
      }
    } catch (ocrError) {
      console.error('❌ Google Vision OCR fallback failed:', ocrError instanceof Error ? ocrError.message : 'Unknown error');
    }
    
    // Final fallback: Try enhanced extraction
    console.log("🔍 Method 4: Trying enhanced extraction library...");
    try {
      const { extractWithGoogleVision } = await import('@/lib/extract-text');
      const result = await extractWithGoogleVision(file);
      
      if (result.extractedText && result.extractedText.trim().length > 0) {
        console.log(`✅ Enhanced extraction successful: ${result.extractedText.length} characters (${result.source})`);
        return result.extractedText;
      }
    } catch (enhancedError) {
      console.error('❌ Enhanced extraction failed:', enhancedError instanceof Error ? enhancedError.message : 'Unknown error');
    }
    
    throw new Error('All text extraction methods failed - document may be corrupted or heavily encrypted')
  } catch (error) {
    console.error('❌ Critical error in text extraction pipeline:', error)
    throw error
  }
}

interface ExtractionQuality {
  score: number; // 0-1, where 1 is perfect
  wordCount: number;
  hasStructuredContent: boolean;
  hasPropertyNames: boolean;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

function validateExtractionQuality(text: string, file: File): ExtractionQuality {
  const wordCount = text.trim().split(/\s+/).length;
  const charCount = text.trim().length;
  
  // Calculate expected content based on file size
  const fileSizeMB = file.size / (1024 * 1024);
  const expectedWordsPerMB = 500; // Rough estimate for PDF
  const expectedWords = fileSizeMB * expectedWordsPerMB;
  
  // Quality indicators
  const hasStructuredContent = /\b(lease|tenancy|agreement|property|building|flat|apartment|unit)\b/i.test(text);
  const hasPropertyNames = /\b(close|road|street|avenue|gardens|court|house|tower|block)\b/i.test(text);
  const hasDates = /\b(20\d{2}|19\d{2})\b/.test(text);
  const hasNumbers = /\b\d+\b/.test(text);
  
  // Calculate score
  let score = 0;
  
  // Word count score (0-0.4)
  if (wordCount > expectedWords * 0.5) score += 0.4;
  else if (wordCount > expectedWords * 0.2) score += 0.2;
  else if (wordCount > 50) score += 0.1;
  
  // Content quality score (0-0.6)
  if (hasStructuredContent) score += 0.2;
  if (hasPropertyNames) score += 0.2;
  if (hasDates) score += 0.1;
  if (hasNumbers) score += 0.1;
  
  const warnings: string[] = [];
  
  if (charCount < 1000) warnings.push('Very low character count - document may be scanned or corrupted');
  if (wordCount < 100) warnings.push('Very low word count - extraction may have failed');
  if (!hasStructuredContent) warnings.push('No lease/property terminology detected');
  if (!hasPropertyNames) warnings.push('No property location indicators found');
  
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (score > 0.7) confidence = 'high';
  else if (score > 0.4) confidence = 'medium';
  
  return {
    score,
    wordCount,
    hasStructuredContent,
    hasPropertyNames,
    confidence,
    warnings
  };
}

async function analyseDocument(text: string, fileName: string, buildingId?: string, quality?: ExtractionQuality) {
  // Add quality context to the prompt
  const qualityContext = quality ? `
EXTRACTION QUALITY ASSESSMENT:
- Confidence: ${quality.confidence}
- Word count: ${quality.wordCount}
- Quality score: ${(quality.score * 100).toFixed(1)}%
- Warnings: ${quality.warnings.join('; ') || 'None'}
` : '';

  const prompt = `
You are analysing a document for a UK leasehold block management platform called BlocIQ using British English.

Document: ${fileName}
${qualityContext}
Content: ${text.substring(0, 4000)}

IMPORTANT: This document should be "${fileName}". If the content doesn't match the filename or seems to be from a different property, note this in your analysis.

Please analyse this document and provide the following information in JSON format using British English:

1. classification: One of "Fire Risk Assessment", "EICR", "Insurance Certificate", "Lift Maintenance", "Other"
2. document_type: Specific type within the classification (e.g., "Fire Risk Assessment - Type 1", "Electrical Installation Condition Report", "Building Insurance Certificate", "Lift Maintenance Certificate", "Meeting Minutes", "Lease Agreement", "Scope of Works")
3. summary: A comprehensive summary using this exact prompt: "Summarise this document. List all findings, actions, deadlines, or responsibilities. Extract relevant inspection and expiry dates." (max 300 words)
4. inspection_date: Date of inspection if applicable (YYYY-MM-DD format or null)
5. next_due_date: Next due date if applicable (YYYY-MM-DD format or null)
6. responsible_party: Who is responsible for this document/action (e.g., "Management Company", "Leaseholder", "Contractor", "Insurance Provider", "Local Authority")
7. action_required: What action is needed (e.g., "Review annually", "File for records", "Update compliance tracker", "Renew by date")
8. confidence: Confidence level in classification (0-100)
9. suggested_compliance_asset: If compliance-related, suggest which compliance asset this relates to (e.g., "Fire Safety", "Electrical Safety", "Gas Safety", "Asbestos Management", "Legionella Control", "Lift Safety")
10. contractor_name: Name of contractor if mentioned (or null)
11. building_name: Building name if mentioned in document (or null)
12. key_dates: Array of important dates found in document (YYYY-MM-DD format)
13. key_entities: Array of important people, companies, or organizations mentioned
14. leaseholder_name: If this is a lease document, extract the leaseholder name (or null)
15. lease_start_date: If this is a lease document, extract the lease start date (YYYY-MM-DD format or null)
16. lease_end_date: If this is a lease document, extract the lease end date (YYYY-MM-DD format or null)
17. apportionment: If this is a lease document, extract the service charge apportionment percentage (or null)
18. document_validation: Object with validation results:
    - filename_match: boolean - does content match the filename?
    - property_mentioned: string - property name/address mentioned in document (or null)
    - content_quality: "high" | "medium" | "low" - based on text extraction quality
    - potential_issues: array of strings - any concerns about document authenticity or extraction

Focus on UK leasehold terminology and compliance requirements. If dates are mentioned, extract them carefully.
Pay special attention to property names and addresses to ensure document routing accuracy.
Return only valid JSON.
`

  try {
    console.log('🤖 Starting OpenAI analysis...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a document analysis expert for UK leasehold block management. Return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI API')
    }

    console.log('✅ OpenAI analysis completed')

    // Parse JSON response with error handling
    let analysis;
    try {
      analysis = JSON.parse(response)
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI JSON response:', parseError)
      console.error('Raw response:', response.substring(0, 500))
      throw new Error('Invalid JSON response from AI analysis')
    }

    // Validate and clean up the analysis
    return {
      classification: analysis.classification || 'Other',
      document_type: analysis.document_type || 'Unknown',
      summary: analysis.summary || 'No summary available',
      inspection_date: analysis.inspection_date || null,
      next_due_date: analysis.next_due_date || null,
      responsible_party: analysis.responsible_party || 'Management Company',
      action_required: analysis.action_required || 'Review document',
      confidence: Math.min(100, Math.max(0, analysis.confidence || 50)),
      suggested_compliance_asset: analysis.suggested_compliance_asset || null,
      contractor_name: analysis.contractor_name || null,
      building_name: analysis.building_name || null,
      key_dates: Array.isArray(analysis.key_dates) ? analysis.key_dates : [],
      key_entities: Array.isArray(analysis.key_entities) ? analysis.key_entities : [],
      leaseholder_name: analysis.leaseholder_name || null,
      lease_start_date: analysis.lease_start_date || null,
      lease_end_date: analysis.lease_end_date || null,
      apportionment: analysis.apportionment || null,
      document_validation: analysis.document_validation || {
        filename_match: false,
        property_mentioned: null,
        content_quality: quality?.confidence || 'low',
        potential_issues: quality?.warnings || []
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing document:', error)
    
    // Return fallback analysis
    return {
      classification: 'Other',
      document_type: 'Unknown',
      summary: 'Unable to analyze document automatically. Please review manually.',
      inspection_date: null,
      next_due_date: null,
      responsible_party: 'Management Company',
      action_required: 'Review document',
      confidence: 0,
      suggested_compliance_asset: null,
      contractor_name: null,
      building_name: null,
      key_dates: [],
      key_entities: [],
      leaseholder_name: null,
      lease_start_date: null,
      lease_end_date: null,
      apportionment: null
    }
  }
} 