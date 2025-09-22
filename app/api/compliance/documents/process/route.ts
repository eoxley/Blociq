import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { BSAComplianceAnalyzer, BSAComplianceStatus, type BSAAnalysisResult } from '@/lib/compliance/bsa-analyzers';
import { createGoldenThreadEntry, isHigherRiskBuilding, generateOutlookReminder, type GoldenThreadEntry } from '@/lib/compliance/golden-thread';
import {
  createComplianceCalendarEvent,
  createComplianceTask,
  createComplianceEmailAlert,
  createComplianceOverviewEmail
} from '@/lib/outlook/compliance-integrations';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 300; // 5 minutes for compliance processing

export async function POST(req: NextRequest) {
  try {
    // Use service role client for internal processing
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { jobId, filePath, filename, mime, userId, buildingId, assetId } = await req.json();

    if (!jobId || !filePath) {
      return NextResponse.json({
        error: 'Missing required data',
        message: 'Job ID and file path are required'
      }, { status: 400 });
    }

    console.log('🏢 Processing compliance document:', filename, 'for job:', jobId);

    // Update job status to processing
    await serviceSupabase
      .from('document_jobs')
      .update({
        status: 'PROCESSING',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Get the building compliance asset to understand context
    const { data: bcaData, error: bcaError } = await serviceSupabase
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

      await serviceSupabase
        .from('document_jobs')
        .update({
          status: 'FAILED',
          error_message: 'Invalid asset or building combination',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json({
        error: "Invalid asset or building combination"
      }, { status: 400 });
    }

    const assetInfo = bcaData.compliance_assets as any;
    console.log(`🏗️ Asset context: ${assetInfo?.name} (${assetInfo?.category})`);

    // Download file from storage for processing
    const supabase = await createClient();
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('building_documents')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('❌ Failed to download file for processing:', downloadError);

      await serviceSupabase
        .from('document_jobs')
        .update({
          status: 'FAILED',
          error_message: 'Failed to download file for processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json({
        error: 'Failed to download file for processing'
      }, { status: 500 });
    }

    // Convert to File object for processing
    const file = new File([fileData], filename, { type: mime });

    // Analyze file characteristics for optimal OCR selection
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

      await serviceSupabase
        .from('document_jobs')
        .update({
          status: 'FAILED',
          error_message: 'OCR modules unavailable',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json({
        error: 'OCR modules unavailable'
      }, { status: 500 });
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

    // Extract text with intelligent method selection and caching
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
      await serviceSupabase
        .from('document_jobs')
        .update({
          status: 'FAILED',
          error_message: 'Could not extract text from PDF',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json({
        error: 'Could not extract text from PDF. The document may be scanned or corrupted.'
      }, { status: 400 });
    }

    console.log(`✅ Text extracted (${extractionResult.fromCache ? 'from cache' : 'fresh'}):`, {
      length: extractedText.length,
      method: extractionResult.method,
      quality: extractionResult.quality
    });

    // Validate extraction quality
    const { calculateExtractionQuality } = await import('@/lib/ocr/intelligent-selection');
    const extractionQuality = calculateExtractionQuality(extractedText, file, fileCharacteristics);
    console.log("📊 Extraction quality assessment:", {
      level: extractionQuality.quality_level,
      score: extractionQuality.score,
      completionRate: extractionQuality.completion_rate,
      warnings: extractionQuality.warnings.length
    });

    // Generate BSA COMPLIANCE ANALYSIS with AI + Rules hybrid approach
    console.log("🏢 Starting Building Safety Act compliance analysis...");

    // First get AI analysis for context and data extraction
    const aiAnalysis = await analyseComplianceDocument(extractedText, filename, assetInfo, extractionQuality);

    // Then apply BSA-specific rules-based analysis
    const bsaAnalysis = BSAComplianceAnalyzer.analyze(
      aiAnalysis.classification || 'Other',
      extractedText,
      aiAnalysis,
      aiAnalysis.inspection_date,
      aiAnalysis.next_due_date
    );

    console.log("✅ BSA Analysis completed:", {
      status: bsaAnalysis.status,
      priority: bsaAnalysis.priority,
      riskLevel: bsaAnalysis.riskLevel,
      findings: bsaAnalysis.findings.length
    });

    // Create compliance document record
    let complianceDocumentId: string | null = null;
    try {
      console.log("💾 Creating compliance document record for:", filename);

      const { data: complianceDoc, error: docError } = await serviceSupabase
        .from('compliance_documents')
        .insert({
          building_compliance_asset_id: bcaData.id,
          building_id: parseInt(buildingId),
          file_path: filePath,
          original_filename: filename,
          file_type: mime,
          file_size: file.size,
          document_type: aiAnalysis.classification || 'Other',
          document_category: 'Current Certificate',
          ai_confidence_score: aiAnalysis.confidence || 50,
          uploaded_by_user_id: userId,
          processing_status: 'completed'
        })
        .select('id')
        .single();

      if (docError) {
        console.error('❌ Failed to create compliance document record:', docError);
      } else {
        complianceDocumentId = complianceDoc.id;
        console.log("✅ Compliance document record created with ID:", complianceDocumentId);
      }
    } catch (docCreateError) {
      console.error('❌ Error creating compliance document record:', docCreateError);
    }

    // Store BSA compliance analysis data
    if (complianceDocumentId) {
      try {
        console.log(`📊 BSA Compliance Status: ${bsaAnalysis.status}, Priority: ${bsaAnalysis.priority}, Risk: ${bsaAnalysis.riskLevel}`);

        const { error: extractionError } = await serviceSupabase
          .from("ai_document_extractions")
          .insert({
            document_id: complianceDocumentId,
            extracted_data: {
              // AI Analysis
              summary: aiAnalysis.summary,
              classification: aiAnalysis.classification,
              document_type: aiAnalysis.document_type,
              key_dates: aiAnalysis.key_dates,
              key_entities: aiAnalysis.key_entities,
              action_required: aiAnalysis.action_required,
              responsible_party: aiAnalysis.responsible_party,
              suggested_compliance_asset: aiAnalysis.suggested_compliance_asset,

              // BSA Analysis
              bsa_status: bsaAnalysis.status,
              bsa_priority: bsaAnalysis.priority,
              bsa_risk_level: bsaAnalysis.riskLevel,
              bsa_findings: bsaAnalysis.findings,
              bsa_compliance_details: bsaAnalysis.complianceDetails,
              contractor_recommendations: bsaAnalysis.contractorRecommendations,
              regulatory_notes: bsaAnalysis.regulatoryNotes,

              has_action_required: bsaAnalysis.actionRequired !== null,

              // Raw extracted text for user review
              extracted_text: extractedText
            },
            confidence_scores: {
              overall: aiAnalysis.confidence,
              extraction_quality: extractionQuality.score,
              bsa_confidence: bsaAnalysis.riskLevel !== 'unknown' ? 85 : 60
            },
            inspection_date: aiAnalysis.inspection_date || null,
            next_due_date: aiAnalysis.next_due_date || null,
            inspector_name: aiAnalysis.contractor_name || null,
            inspector_company: aiAnalysis.contractor_name || null,
            certificate_number: extractedText.match(/(?:cert|certificate|ref|no)[\s:]*([A-Z0-9\-\/]{6,})/gi)?.[0] || null,
            property_address: aiAnalysis.building_name || null,
            compliance_status: bsaAnalysis.status,
            ai_model_version: 'bsa-v1.0',
            processing_time_ms: extractionResult.stats?.processing_time || 0
          });

        if (extractionError) {
          console.error("❌ Failed to save BSA compliance extraction data:", extractionError);
        } else {
          console.log("✅ BSA compliance AI extraction data saved successfully");
        }
      } catch (error) {
        console.error('⚠️ Error storing BSA compliance analysis:', error);
      }
    }

    // Update the job with success and compliance analysis
    const complianceAnalysis = {
      // BSA Status & Risk
      status: bsaAnalysis.status,
      priority: bsaAnalysis.priority,
      riskLevel: bsaAnalysis.riskLevel,

      // Findings & Actions
      findings: bsaAnalysis.findings,
      actionRequired: bsaAnalysis.actionRequired,
      complianceDetails: bsaAnalysis.complianceDetails,
      contractorRecommendations: bsaAnalysis.contractorRecommendations,
      regulatoryNotes: bsaAnalysis.regulatoryNotes,

      // AI Context
      classification: aiAnalysis.classification,
      document_type: aiAnalysis.document_type,
      summary: aiAnalysis.summary,
      inspection_date: aiAnalysis.inspection_date,
      next_due_date: aiAnalysis.next_due_date,
      responsible_party: aiAnalysis.responsible_party,
      confidence: aiAnalysis.confidence,
      contractor_name: aiAnalysis.contractor_name,
      building_name: aiAnalysis.building_name,
      key_dates: aiAnalysis.key_dates,
      key_entities: aiAnalysis.key_entities,
      document_validation: aiAnalysis.document_validation,

      // Include extracted text for user review
      extracted_text: extractedText.substring(0, 2000) + (extractedText.length > 2000 ? '...' : ''),
      full_text_length: extractedText.length
    };

    const { error: updateError } = await serviceSupabase
      .from('document_jobs')
      .update({
        status: 'COMPLETED',
        summary_json: complianceAnalysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('❌ Failed to update document_jobs with compliance analysis:', updateError);
    } else {
      console.log('✅ Successfully updated document_jobs with compliance analysis for job:', jobId);
    }

    return NextResponse.json({
      success: true,
      jobId,
      complianceAnalysis,
      extractionQuality: {
        score: extractionQuality.score,
        level: extractionQuality.quality_level,
        completionRate: extractionQuality.completion_rate,
        warnings: extractionQuality.warnings
      }
    });

  } catch (error) {
    console.error('❌ Compliance processing error:', error);

    // Update job status to failed
    try {
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { jobId } = await req.json().catch(() => ({}));
      if (jobId) {
        await serviceSupabase
          .from('document_jobs')
          .update({
            status: 'FAILED',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    } catch (updateError) {
      console.error('❌ Failed to update job status to failed:', updateError);
    }

    return NextResponse.json({
      error: 'Processing failed',
      message: error instanceof Error ? error.message : 'Compliance processing failed. Please try again.'
    }, { status: 500 });
  }
}

// Helper functions for OCR processing
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