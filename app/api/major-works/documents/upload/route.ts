/**
 * Major Works Document Upload Route
 * Reuses Lease Lab OCR/upload flow with Major Works-specific logic and Outlook integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { Section20Analyzer, type Section20AnalysisResult, type Section20Stage } from '@/lib/major-works/section20-analyzers'
import {
  createMajorWorksProjectIntegration,
  createSection20CalendarEvent,
  createMajorWorksTask,
  createLeaseholderEmail
} from '@/lib/outlook/major-works-integrations'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 300; // 5 minutes for upload and analysis

// Helper function to categorize major works documents
function categorizeMajorWorksDocument(stage: Section20Stage): string {
  switch (stage) {
    case 'notice_of_intention':
    case 'statement_of_estimates':
    case 'award_of_contract':
      return 'major_works';
    default:
      return 'other';
  }
}

// Helper function to determine project status from stage
function getProjectStatusFromStage(stage: Section20Stage): string {
  switch (stage) {
    case 'notice_of_intention':
      return 'notice_of_intention';
    case 'statement_of_estimates':
      return 'statement_of_estimates';
    case 'award_of_contract':
      return 'contractor_appointed';
    default:
      return 'planning';
  }
}

export async function POST(request: NextRequest) {
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
    const projectId = formData.get('projectId') as string // Optional existing project
    const processingId = formData.get('processingId') as string || Date.now().toString()
    const fileHash = formData.get('fileHash') as string
    const forceReprocess = formData.get('forceReprocess') === 'true'
    const timestamp = formData.get('timestamp') as string

    console.log("🏗️ Processing Major Works document:", {
      fileName: file?.name,
      processingId,
      buildingId,
      projectId: projectId || 'new',
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

    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required for Major Works documents' },
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
          details: `Supported types: PDF, Word documents, text files, and images`,
          receivedType: file.type || 'unknown'
        },
        { status: 400, headers }
      )
    }

    // Validate file size (50MB limit)
    const maxFileSize = 52428800;
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

    console.log("📄 Processing Major Works document:", file.name)

    // 1. Upload file to Supabase storage
    const supabase = createClient()

    // Get current user
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

    // Create storage path: /{buildingId}/major_works/{timestamp}_{originalFileName}
    const fileName = `${buildingId}/major_works/${Date.now()}_${file.name}`
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

    console.log("✅ File uploaded to Major Works folder:", publicUrl)

    // 2. Extract text using OCR pipeline (reuse from upload-and-analyse)
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
          details: 'Could not extract readable text from the document.',
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

    if (extractionQuality.score < 0.3) {
      console.warn("⚠️ Poor extraction quality detected - proceeding with caution");
    }

    // 5. Generate AI analysis for general document understanding
    console.log("🤖 Starting AI document analysis...");
    let aiAnalysis;
    try {
      aiAnalysis = await analyseMajorWorksDocument(extractedText, file.name, buildingId, extractionQuality);
    } catch (aiError) {
      console.error('❌ AI analysis failed:', aiError);
      return NextResponse.json(
        {
          error: 'Document analysis failed',
          details: `AI analysis could not be completed: ${aiError instanceof Error ? aiError.message : 'Unknown AI error'}`,
          extractedText: extractedText.substring(0, 500) + '...',
          suggestions: ['Document can be uploaded for manual review', 'Try again later if this is a temporary issue']
        },
        { status: 500, headers }
      );
    }

    // 6. Perform Section 20 specific analysis
    console.log("🏗️ Starting Section 20 analysis...");
    const section20Analysis = Section20Analyzer.analyze(extractedText, file.name, aiAnalysis);

    console.log("✅ Section 20 Analysis completed:", {
      stage: section20Analysis.stage,
      projectStatus: section20Analysis.projectStatus,
      contractors: section20Analysis.contractors.length,
      confidence: section20Analysis.confidence
    });

    // 7. Get building context
    let buildingContext: any = null;
    try {
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single();

      if (!buildingError && building) {
        buildingContext = building;
        console.log(`🏢 Building context: ${building.name}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch building context:', error);
    }

    // 8. Create document record
    let documentId: string | null = null;
    try {
      console.log("💾 Creating Major Works document record for:", file.name);

      const { data: documentData, error: docError } = await supabase
        .from('building_documents')
        .insert({
          name: file.name,
          file_path: fileName,
          building_id: buildingId,
          type: 'Major Works',
          category: categorizeMajorWorksDocument(section20Analysis.stage),
          file_size: file.size,
          uploaded_by: user.id,
          ocr_status: 'completed',
          ocr_text: extractedText.substring(0, 65535), // Postgres TEXT limit
          metadata: {
            original_filename: file.name,
            public_url: publicUrl,
            file_type: file.type,
            processing_method: extractionResult.method,
            quality_score: extractionQuality?.score,
            ai_confidence: aiAnalysis?.confidence,
            section20_stage: section20Analysis.stage,
            section20_confidence: section20Analysis.confidence,
            project_title: section20Analysis.projectTitle,
            estimated_cost: section20Analysis.estimatedCost,
            contractors: section20Analysis.contractors,
            consultation_deadline: section20Analysis.timeline.consultationDeadline
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

    // 9. Handle Major Works project creation/linking
    let majorWorksProjectId: string | null = projectId || null;
    let projectCreated = false;

    try {
      if (!projectId && section20Analysis.stage !== 'other') {
        // Create new project if none specified and we detected a valid stage
        console.log("🏗️ Creating new Major Works project...");

        const projectData = {
          building_id: buildingId,
          name: section20Analysis.projectTitle || `Major Works - ${file.name}`,
          title: section20Analysis.projectTitle || `Major Works - ${buildingContext?.name || 'Building'}`,
          description: section20Analysis.workDetails.scope || aiAnalysis.summary,
          status: getProjectStatusFromStage(section20Analysis.stage),
          project_type: 'section20',
          priority: section20Analysis.estimatedCost && section20Analysis.estimatedCost > 50000 ? 'high' : 'medium',
          budget_allocated: section20Analysis.estimatedCost || 0,
          created_by: user.id,
          start_date: section20Analysis.timeline.worksStartDate || null,
          attachments: [{
            document_id: documentId,
            filename: file.name,
            upload_date: new Date().toISOString(),
            stage: section20Analysis.stage
          }],
          stakeholders: section20Analysis.contractors.map(c => ({
            name: c.name,
            role: 'contractor',
            contact: c.contact || null
          })),
          milestones: section20Analysis.timeline.consultationDeadline ? [{
            name: 'Consultation Period End',
            date: section20Analysis.timeline.consultationDeadline,
            status: 'pending'
          }] : []
        };

        const { data: newProject, error: projectError } = await supabase
          .from('major_works_projects')
          .insert(projectData)
          .select('id')
          .single();

        if (projectError) {
          console.warn('⚠️ Failed to create Major Works project:', projectError);
        } else {
          majorWorksProjectId = newProject.id;
          projectCreated = true;
          console.log("✅ Major Works project created with ID:", majorWorksProjectId);
        }
      } else if (projectId) {
        // Link to existing project
        console.log("🔗 Linking document to existing project:", projectId);

        const { error: linkError } = await supabase
          .from('major_works_projects')
          .update({
            attachments: supabase.raw(`
              COALESCE(attachments, '[]'::jsonb) || '[{
                "document_id": "${documentId}",
                "filename": "${file.name}",
                "upload_date": "${new Date().toISOString()}",
                "stage": "${section20Analysis.stage}"
              }]'::jsonb
            `)
          })
          .eq('id', projectId);

        if (linkError) {
          console.warn('⚠️ Failed to link document to project:', linkError);
        } else {
          console.log("✅ Document linked to existing project");
        }
      }
    } catch (projectError) {
      console.error('⚠️ Error handling Major Works project:', projectError);
    }

    // 10. Create major works log entry
    if (majorWorksProjectId) {
      try {
        const { error: logError } = await supabase
          .from('major_works_logs')
          .insert({
            project_id: majorWorksProjectId,
            action: `Document uploaded: ${section20Analysis.stage}`,
            description: `${file.name} uploaded and analyzed. Stage: ${section20Analysis.stage}, Confidence: ${section20Analysis.confidence}%`,
            document_id: documentId,
            user_id: user.id,
            metadata: {
              stage: section20Analysis.stage,
              confidence: section20Analysis.confidence,
              contractors_detected: section20Analysis.contractors.length,
              estimated_cost: section20Analysis.estimatedCost,
              ai_analysis: aiAnalysis,
              section20_analysis: section20Analysis
            }
          });

        if (logError) {
          console.warn("⚠️ Failed to create Major Works log entry:", logError);
        } else {
          console.log("✅ Major Works log entry created");
        }
      } catch (logCreateError) {
        console.warn('⚠️ Error creating Major Works log:', logCreateError);
      }
    }

    // 11. OUTLOOK INTEGRATION - Create calendar, tasks, and email drafts
    let outlookCalendarId: string | null = null;
    let outlookTaskId: string | null = null;
    let outlookEmailId: string | null = null;

    if (section20Analysis.stage !== 'other') {
      try {
        console.log(`📅 Creating Outlook integration for ${section20Analysis.stage}...`);

        // Get leaseholder emails (simplified - would normally fetch from building data)
        const leaseholderEmails: string[] = []; // TODO: Fetch from building/leaseholder data

        const outlookIntegration = await createMajorWorksProjectIntegration(
          section20Analysis.stage,
          buildingContext?.name || 'Building',
          section20Analysis.projectTitle || file.name,
          section20Analysis,
          leaseholderEmails,
          {
            name: file.name,
            content: fileBuffer.toString('base64'),
            contentType: file.type
          }
        );

        outlookCalendarId = outlookIntegration.calendarEventId || null;
        outlookTaskId = outlookIntegration.taskId || null;
        outlookEmailId = outlookIntegration.emailId || null;

        console.log("✅ Outlook integration completed:", outlookIntegration.integrationSummary);

      } catch (outlookError) {
        console.warn('⚠️ Outlook integration failed:', outlookError);
        // Continue processing even if Outlook fails
      }
    }

    // 12. Return Major Works analysis results
    return NextResponse.json({
      success: true,
      type: 'major_works_analysis',
      processingId: processingId,
      fileHash: fileHash || generatedFileHash,
      processedAt: new Date().toISOString(),
      cached: extractionResult.fromCache || false,

      // Document information
      document: {
        id: documentId,
        filename: file.name,
        file_path: fileName,
        file_url: publicUrl,
        file_size: file.size,
        building_id: buildingId,
        processing_status: 'completed'
      },

      // Section 20 Analysis (primary response)
      section20Analysis: {
        stage: section20Analysis.stage,
        projectStatus: section20Analysis.projectStatus,
        buildingName: section20Analysis.buildingName,
        projectTitle: section20Analysis.projectTitle,
        estimatedCost: section20Analysis.estimatedCost,
        contractors: section20Analysis.contractors,
        leaseholderContribution: section20Analysis.leaseholderContribution,
        consultationPeriod: section20Analysis.consultationPeriod,
        workDetails: section20Analysis.workDetails,
        timeline: section20Analysis.timeline,
        compliance: section20Analysis.compliance,
        confidence: section20Analysis.confidence
      },

      // Major Works Project
      majorWorksProject: {
        project_id: majorWorksProjectId,
        project_created: projectCreated,
        project_status: getProjectStatusFromStage(section20Analysis.stage),
        linked_to_existing: !!projectId && !projectCreated
      },

      // Outlook Integration Results
      outlookIntegration: {
        calendar_event_created: outlookCalendarId !== null,
        calendar_event_id: outlookCalendarId,
        task_created: outlookTaskId !== null,
        task_id: outlookTaskId,
        email_draft_created: outlookEmailId !== null,
        email_draft_id: outlookEmailId,
        integration_successful: (outlookCalendarId || outlookTaskId || outlookEmailId) !== null,
        features_used: [
          ...(outlookCalendarId ? ['consultation_deadline_calendar'] : []),
          ...(outlookTaskId ? ['project_management_task'] : []),
          ...(outlookEmailId ? ['leaseholder_communication_draft'] : [])
        ]
      },

      // AI Analysis Context
      aiAnalysis: {
        classification: aiAnalysis.classification,
        summary: aiAnalysis.summary,
        confidence: aiAnalysis.confidence,
        building_name: aiAnalysis.building_name,
        key_dates: aiAnalysis.key_dates,
        key_entities: aiAnalysis.key_entities
      },

      // Quality metrics
      extractionQuality: {
        score: extractionQuality.score,
        level: extractionQuality.quality_level,
        completionRate: extractionQuality.completion_rate,
        warnings: extractionQuality.warnings
      },

      // User Confirmation Required
      userConfirmation: {
        required: true,
        modal_data: {
          document_info: {
            filename: file.name,
            documentType: 'Major Works',
            stage: section20Analysis.stage,
            buildingName: buildingContext?.name || 'Building',
            projectTitle: section20Analysis.projectTitle || file.name
          },
          section20_analysis: section20Analysis,
          project_id: majorWorksProjectId,
          outlook_calendar_id: outlookCalendarId,
          outlook_task_id: outlookTaskId,
          outlook_email_id: outlookEmailId
        }
      }
    }, { headers })

  } catch (error) {
    console.error('❌ Error processing Major Works document:', error)
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
      error: 'Failed to process Major Works document. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error',
      processingId: processingIdFromError,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: 500, headers })
  }
}

// Reuse extraction function from upload-and-analyse
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

// Major Works specific AI analysis
async function analyseMajorWorksDocument(text: string, fileName: string, buildingId?: string, quality?: any) {
  const qualityContext = quality ? `
EXTRACTION QUALITY ASSESSMENT:
- Confidence: ${quality.confidence}
- Word count: ${quality.wordCount}
- Quality score: ${(quality.score * 100).toFixed(1)}%
- Warnings: ${quality.warnings.join('; ') || 'None'}
` : '';

  const prompt = `
You are analysing a Major Works document for a UK leasehold block management platform called BlocIQ.

Document: ${fileName}
${qualityContext}
Content: ${text.substring(0, 4000)}

This document should be related to Major Works for leasehold properties. Please analyse this document and provide the following information in JSON format:

1. classification: One of "Notice of Intention", "Statement of Estimates", "Award of Contract", "Works Order", "Major Works Communication", "Other"
2. document_type: Specific type within the classification
3. summary: A comprehensive summary focusing on major works details, Section 20 consultation stage, costs, contractors, and timelines (max 300 words)
4. building_name: Building name if mentioned in document (or null)
5. project_title: Title or description of the major works project
6. estimated_cost: Total estimated cost if mentioned (numeric value or null)
7. contractors_mentioned: Array of contractor names mentioned in the document
8. consultation_stage: One of "notice_of_intention", "statement_of_estimates", "contractor_appointment", "other", or null
9. key_dates: Array of important dates found in document (YYYY-MM-DD format)
10. key_entities: Array of important people, companies, or organizations mentioned
11. section20_required: Boolean - whether this appears to be a Section 20 consultation document
12. consultation_deadline: Date when consultation period ends (YYYY-MM-DD format or null)
13. works_start_date: Date when works are scheduled to start (YYYY-MM-DD format or null)
14. leaseholder_contribution: Estimated cost per leaseholder (numeric value or null)
15. confidence: Confidence level in classification (0-100)

Focus on UK leasehold Major Works terminology, Section 20 consultation requirements, and contractor/cost information.
Pay attention to consultation periods, leaseholder obligations, and project timelines.
Return only valid JSON.
`;

  try {
    console.log('🤖 Starting Major Works AI analysis...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Major Works document analysis expert for UK leasehold block management. Return only valid JSON."
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

    console.log('✅ Major Works AI analysis completed')

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
      building_name: analysis.building_name || null,
      project_title: analysis.project_title || null,
      estimated_cost: analysis.estimated_cost || null,
      contractors_mentioned: Array.isArray(analysis.contractors_mentioned) ? analysis.contractors_mentioned : [],
      consultation_stage: analysis.consultation_stage || null,
      key_dates: Array.isArray(analysis.key_dates) ? analysis.key_dates : [],
      key_entities: Array.isArray(analysis.key_entities) ? analysis.key_entities : [],
      section20_required: analysis.section20_required || false,
      consultation_deadline: analysis.consultation_deadline || null,
      works_start_date: analysis.works_start_date || null,
      leaseholder_contribution: analysis.leaseholder_contribution || null,
      confidence: Math.min(100, Math.max(0, analysis.confidence || 50))
    }

  } catch (error) {
    console.error('❌ Error analyzing Major Works document:', error)

    // Return fallback analysis
    return {
      classification: 'Other',
      document_type: 'Unknown',
      summary: 'Unable to analyze document automatically. Please review manually.',
      building_name: null,
      project_title: null,
      estimated_cost: null,
      contractors_mentioned: [],
      consultation_stage: null,
      key_dates: [],
      key_entities: [],
      section20_required: false,
      consultation_deadline: null,
      works_start_date: null,
      leaseholder_contribution: null,
      confidence: 0
    }
  }
}