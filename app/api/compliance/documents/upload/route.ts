// ✅ COMPLIANCE UPLOAD USING LEASE ANALYSIS PIPELINE
// Uses the exact same upload function as lease analysis with compliance-specific response

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 180; // 3 minutes for upload and analysis

export async function POST(request: NextRequest) {
  // Add cache-busting headers
  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Content-Type': 'application/json'
  };

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const buildingId = formData.get('buildingId') as string
    const assetId = formData.get('assetId') as string
    const originalFilename = formData.get('originalFilename') as string
    const processingId = formData.get('processingId') as string || Date.now().toString()
    const fileHash = formData.get('fileHash') as string
    const forceReprocess = formData.get('forceReprocess') === 'true'
    const timestamp = formData.get('timestamp') as string

    console.log("📎 Processing compliance document with lease analysis pipeline:", {
      fileName: file?.name,
      processingId,
      fileHash: fileHash?.substring(0, 8) + '...',
      forceReprocess,
      timestamp,
      assetId,
      buildingId
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400, headers }
      )
    }

    if (!assetId || !buildingId) {
      return NextResponse.json({
        error: "Missing required fields: buildingId and assetId are required"
      }, { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    console.log("📄 Processing PDF:", file.name)

    // 1. Upload file to Supabase storage
    const supabase = await createClient()

    // Get current user for storage path
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the building compliance asset to understand context
    const { data: bcaData, error: bcaError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        compliance_asset_id,
        compliance_assets(name, category, description)
      `)
      .eq('building_id', buildingId)
      .eq('compliance_asset_id', assetId)
      .single();

    if (bcaError || !bcaData) {
      console.error("❌ Failed to find building compliance asset:", bcaError);
      return NextResponse.json({
        error: "Invalid asset or building combination"
      }, { status: 400 });
    }

    const assetInfo = bcaData.compliance_assets as any;
    console.log(`🏗️ Asset context: ${assetInfo?.name} (${assetInfo?.category})`);

    const fileName = `compliance/${buildingId}/${assetId}/${Date.now()}_${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('building-documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('❌ File upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('building-documents')
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
      throw new Error(`OCR modules unavailable: ${importError instanceof Error ? importError.message : 'Unknown import error'}`);
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
        { error: 'Could not extract text from PDF. The document may be scanned or corrupted.' },
        { status: 400 }
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

    // 5. Generate COMPLIANCE-SPECIFIC AI analysis
    const complianceAnalysis = await analyseComplianceDocument(extractedText, file.name, assetInfo, extractionQuality)

    // 6. Create compliance document record
    let complianceDocumentId: string | null = null;
    try {
      console.log("💾 Creating compliance document record for:", file.name);

      const { data: complianceDoc, error: docError } = await supabase
        .from('compliance_documents')
        .insert({
          building_compliance_asset_id: bcaData.id,
          building_id: parseInt(buildingId),
          file_path: fileName,
          original_filename: originalFilename || file.name,
          file_type: file.type,
          file_size: file.size,
          document_type: complianceAnalysis.classification || 'Other',
          document_category: 'Current Certificate',
          ai_confidence_score: complianceAnalysis.confidence || 50,
          uploaded_by_user_id: user.id,
          processing_status: 'completed'
        })
        .select('id')
        .single();

      if (docError) {
        console.error('❌ Failed to create compliance document record:', docError);
        // Continue without document linking
      } else {
        complianceDocumentId = complianceDoc.id;
        console.log("✅ Compliance document record created with ID:", complianceDocumentId);
      }
    } catch (docCreateError) {
      console.error('❌ Error creating compliance document record:', docCreateError);
    }

    // 7. Store compliance-specific AI extraction data
    if (complianceDocumentId) {
      try {
        const { error: extractionError } = await supabase
          .from("ai_document_extractions")
          .insert({
            document_id: complianceDocumentId,
            extracted_data: {
              summary: complianceAnalysis.summary,
              classification: complianceAnalysis.classification,
              document_type: complianceAnalysis.document_type,
              key_dates: complianceAnalysis.key_dates,
              key_entities: complianceAnalysis.key_entities,
              action_required: complianceAnalysis.action_required,
              responsible_party: complianceAnalysis.responsible_party,
              suggested_compliance_asset: complianceAnalysis.suggested_compliance_asset
            },
            confidence_scores: {
              overall: complianceAnalysis.confidence,
              extraction_quality: extractionQuality.score
            },
            inspection_date: complianceAnalysis.inspection_date || null,
            next_due_date: complianceAnalysis.next_due_date || null,
            inspector_name: complianceAnalysis.contractor_name || null,
            inspector_company: complianceAnalysis.contractor_name || null,
            certificate_number: extractedText.match(/(?:cert|certificate|ref|no)[\s:]*([A-Z0-9\-\/]{6,})/gi)?.[0] || null,
            property_address: complianceAnalysis.building_name || null,
            compliance_status: complianceAnalysis.action_required?.toLowerCase().includes('satisfactory') ? 'Pass' :
                              complianceAnalysis.action_required?.toLowerCase().includes('fail') ? 'Fail' : null,
            ai_model_version: 'compliance-v1.0',
            processing_time_ms: extractionResult.stats?.processing_time || 0
          });

        if (extractionError) {
          console.error("❌ Failed to save compliance extraction data:", extractionError);
        } else {
          console.log("✅ Compliance AI extraction data saved successfully");
        }
      } catch (error) {
        console.error('⚠️ Error storing compliance analysis:', error);
      }
    }

    // 8. Return COMPLIANCE-SPECIFIC analysis results
    return NextResponse.json({
      success: true,
      type: 'compliance_analysis',
      processingId: processingId,
      fileHash: fileHash || generatedFileHash,
      processedAt: new Date().toISOString(),
      cached: extractionResult.fromCache || false,

      // Compliance document information
      document: {
        id: complianceDocumentId,
        filename: originalFilename || file.name,
        file_path: fileName,
        file_url: publicUrl,
        file_size: file.size,
        building_id: buildingId,
        asset_context: `${assetInfo?.name} (${assetInfo?.category})`,
        processing_status: 'completed'
      },

      // Compliance-specific analysis (primary response)
      complianceAnalysis: {
        classification: complianceAnalysis.classification,
        document_type: complianceAnalysis.document_type,
        summary: complianceAnalysis.summary,
        inspection_date: complianceAnalysis.inspection_date,
        next_due_date: complianceAnalysis.next_due_date,
        responsible_party: complianceAnalysis.responsible_party,
        action_required: complianceAnalysis.action_required,
        confidence: complianceAnalysis.confidence,
        suggested_compliance_asset: complianceAnalysis.suggested_compliance_asset,
        contractor_name: complianceAnalysis.contractor_name,
        building_name: complianceAnalysis.building_name,
        key_dates: complianceAnalysis.key_dates,
        key_entities: complianceAnalysis.key_entities,
        document_validation: complianceAnalysis.document_validation
      },

      // Quality metrics
      extractionQuality: {
        score: extractionQuality.score,
        level: extractionQuality.quality_level,
        completionRate: extractionQuality.completion_rate,
        warnings: extractionQuality.warnings
      },

      // Debug information
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        file_name: fileName,
        asset_context: `${assetInfo?.name} (${assetInfo?.category})`,
        extracted_text_preview: extractedText.substring(0, 500) + '...',
        full_text_length: extractedText.length
      }
    }, { headers })

  } catch (error) {
    console.error('❌ Error processing compliance document:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace available')

    const errorResponse = {
      error: 'Failed to process compliance document. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error',
      processingId: processingId || null,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: 500, headers })
  }
}

// Copy all the helper functions from lease analysis route
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

// COMPLIANCE-SPECIFIC ANALYSIS FUNCTION
async function analyseComplianceDocument(text: string, fileName: string, assetInfo: any, quality?: any) {
  // Add quality context to the prompt
  const qualityContext = quality ? `
EXTRACTION QUALITY ASSESSMENT:
- Confidence: ${quality.confidence}
- Word count: ${quality.wordCount}
- Quality score: ${(quality.score * 100).toFixed(1)}%
- Warnings: ${quality.warnings.join('; ') || 'None'}
` : '';

  const assetContext = assetInfo ? `
COMPLIANCE ASSET CONTEXT:
- Asset Name: ${assetInfo.name}
- Asset Category: ${assetInfo.category}
- Asset Description: ${assetInfo.description || 'N/A'}
` : '';

  const prompt = `
You are analysing a COMPLIANCE document for a UK leasehold block management platform called BlocIQ using British English.

Document: ${fileName}
${qualityContext}
${assetContext}
Content: ${text.substring(0, 4000)}

IMPORTANT: This document should be "${fileName}" related to ${assetInfo?.name} (${assetInfo?.category}). If the content doesn't match the expected compliance asset or seems to be from a different property/asset, note this in your analysis.

Please analyse this COMPLIANCE document and provide the following information in JSON format using British English:

1. classification: One of "Fire Risk Assessment", "EICR", "Gas Safety Certificate", "Insurance Certificate", "Lift Maintenance", "Asbestos Survey", "Legionella Assessment", "PAT Testing", "Other"
2. document_type: Specific type within the classification (e.g., "Fire Risk Assessment - Type 1", "Electrical Installation Condition Report", "Building Insurance Certificate", "Lift Maintenance Certificate", "Gas Safety Record", "Asbestos Management Survey")
3. summary: A comprehensive summary focusing on: "Summarise this compliance document. List all findings, observations, defects, actions required, deadlines, inspection results, and any compliance status. Extract all relevant inspection and expiry dates." (max 400 words)
4. inspection_date: Date of inspection/testing if applicable (YYYY-MM-DD format or null)
5. next_due_date: Next due/expiry date if applicable (YYYY-MM-DD format or null)
6. responsible_party: Who is responsible for this compliance area (e.g., "Management Company", "Landlord", "Specialist Contractor", "Building Owner", "Duty Holder")
7. action_required: What action is needed (e.g., "Review annually", "Renew before expiry", "Address Category 1 defects immediately", "Schedule remedial works", "File for records")
8. confidence: Confidence level in classification (0-100)
9. suggested_compliance_asset: Confirm or suggest which compliance asset this relates to (e.g., "Fire Safety", "Electrical Safety", "Gas Safety", "Asbestos Management", "Legionella Control", "Lift Safety", "Insurance", "Building Fabric")
10. contractor_name: Name of contractor/inspector if mentioned (or null)
11. building_name: Building name if mentioned in document (or null)
12. key_dates: Array of ALL important dates found in document with labels (e.g., ["2023-07-15: Inspection Date", "2028-07-15: Next Due"])
13. key_entities: Array of important people, companies, organizations, or certificate numbers mentioned
14. document_validation: Object with validation results:
    - filename_match: boolean - does content match the filename and expected asset type?
    - property_mentioned: string - property name/address mentioned in document (or null)
    - content_quality: "high" | "medium" | "low" - based on text extraction quality
    - potential_issues: array of strings - any concerns about document authenticity, extraction quality, or content mismatch

Focus on UK compliance terminology and requirements. Extract dates carefully including inspection, expiry, and next due dates.
Pay special attention to compliance status (pass/fail/satisfactory/unsatisfactory), defects found, and required actions.
Return only valid JSON.
`;

  try {
    console.log('🤖 Starting OpenAI compliance analysis...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a compliance document analysis expert for UK leasehold block management. Focus on extracting key dates, compliance status, defects, and required actions. Return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      timeout: 60000, // 60 second timeout
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI API')
    }

    console.log('✅ OpenAI compliance analysis completed')

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
      document_validation: analysis.document_validation || {
        filename_match: false,
        property_mentioned: null,
        content_quality: quality?.confidence || 'low',
        potential_issues: quality?.warnings || []
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing compliance document:', error)

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
      document_validation: {
        filename_match: false,
        property_mentioned: null,
        content_quality: 'low',
        potential_issues: ['Analysis failed - manual review required']
      }
    }
  }
}