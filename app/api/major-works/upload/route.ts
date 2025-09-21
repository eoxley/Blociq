import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 180; // 3 minutes for upload and analysis

// Major Works specific document stages
const MAJOR_WORKS_STAGES = {
  NOTICE_OF_INTENTION: 'Notice of Intention',
  STATEMENT_OF_ESTIMATES: 'Statement of Estimates',
  AWARD_OF_CONTRACT: 'Award of Contract',
  WORKS_ORDER: 'Works Order',
  COMPLETION_CERTIFICATE: 'Completion Certificate',
  FINAL_ACCOUNT: 'Final Account',
  OTHER: 'Other'
}

interface MajorWorksAnalysis {
  stage: string;
  building_name?: string;
  estimated_cost?: number;
  contractors: string[];
  leaseholder_thresholds?: number;
  works_description?: string;
  consultation_period_days?: number;
  start_date?: string;
  completion_date?: string;
  confidence: number;
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
    const originalFilename = formData.get('originalFilename') as string || file?.name

    console.log("🏗️ Processing Major Works document:", {
      fileName: file?.name,
      buildingId,
      originalFilename
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

    // Validate file type - Major Works typically come as PDFs, Word docs, or images
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png'
    ];

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png'];

    if (!allowedMimeTypes.includes(file.type) &&
        !allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return NextResponse.json(
        {
          error: 'File type not supported for Major Works',
          details: 'Supported types: PDF, Word documents, and images (JPG, PNG)',
          receivedType: file.type || 'unknown'
        },
        { status: 400, headers }
      )
    }

    // File size validation (50MB limit)
    const maxFileSize = 52428800; // 50MB
    if (file.size > maxFileSize) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `Maximum file size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
        },
        { status: 400, headers }
      )
    }

    // 1. Create Supabase client and authenticate
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('❌ Authentication error:', userError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers }
      )
    }

    // 2. Upload to building_documents bucket with Major Works-specific path
    const timestamp = Date.now()
    const storagePath = `${buildingId}/major_works/${timestamp}_${originalFilename}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('building-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('❌ File upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500, headers }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('building-documents')
      .getPublicUrl(storagePath)

    console.log("✅ Major Works file uploaded:", publicUrl)

    // 3. Extract text using the existing OCR pipeline
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    let extractedText = '';

    try {
      // Reuse the intelligent OCR selection from upload-and-analyse
      const { analyzeFileCharacteristics, selectOptimalOCRMethods } = await import('@/lib/ocr/intelligent-selection');
      const { getOrExtractText } = await import('@/lib/ocr/extraction-cache');

      const fileCharacteristics = await analyzeFileCharacteristics(file);

      const extractionResult = await getOrExtractText(fileBuffer, async () => {
        const startTime = Date.now();
        const text = await extractTextFromMajorWorksDocument(file, fileCharacteristics);
        const processingTime = Date.now() - startTime;

        return {
          text,
          method: 'major_works_extraction',
          stats: { processing_time: processingTime },
          quality: 0.8 // Default quality score
        };
      });

      extractedText = extractionResult.text;

    } catch (extractionError) {
      console.error('❌ Text extraction failed:', extractionError);
      return NextResponse.json(
        {
          error: 'Text extraction failed',
          details: extractionError instanceof Error ? extractionError.message : 'Unknown extraction error'
        },
        { status: 500, headers }
      )
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'No text could be extracted from document',
          details: 'The document may be scanned, corrupted, or contain only images'
        },
        { status: 400, headers }
      )
    }

    console.log(`✅ Text extracted for Major Works: ${extractedText.length} characters`);

    // 4. AI Analysis for Major Works-specific content
    let majorWorksAnalysis: MajorWorksAnalysis;
    try {
      majorWorksAnalysis = await analyseMajorWorksDocument(extractedText, originalFilename, buildingId);
    } catch (aiError) {
      console.error('❌ Major Works AI analysis failed:', aiError);
      return NextResponse.json(
        {
          error: 'Document analysis failed',
          details: aiError instanceof Error ? aiError.message : 'AI analysis error'
        },
        { status: 500, headers }
      )
    }

    // 5. Insert into building_documents table
    let documentId: string | null = null;
    try {
      const { data: documentData, error: docError } = await supabase
        .from('building_documents')
        .insert({
          name: originalFilename,
          file_path: storagePath,
          building_id: parseInt(buildingId),
          uploaded_by: user.id,
          document_type: 'major_works',
          category: 'major_works',
          file_size: file.size,
          ocr_status: 'completed',
          ocr_text: extractedText.substring(0, 65535), // Postgres TEXT limit
          metadata: {
            original_filename: originalFilename,
            public_url: publicUrl,
            file_type: file.type,
            stage: majorWorksAnalysis.stage,
            contractors: majorWorksAnalysis.contractors,
            estimated_cost: majorWorksAnalysis.estimated_cost,
            leaseholder_thresholds: majorWorksAnalysis.leaseholder_thresholds,
            works_description: majorWorksAnalysis.works_description,
            ai_confidence: majorWorksAnalysis.confidence
          }
        })
        .select('id')
        .single();

      if (docError) {
        console.error('❌ Failed to create document record:', docError);
        throw new Error(`Database error: ${docError.message}`);
      }

      documentId = documentData.id;
      console.log("✅ Major Works document record created:", documentId);

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        {
          error: 'Failed to save document record',
          details: dbError instanceof Error ? dbError.message : 'Database error'
        },
        { status: 500, headers }
      )
    }

    // 6. Link to major_works_projects table
    let projectId: string | null = null;
    try {
      projectId = await linkToMajorWorksProject(supabase, buildingId, majorWorksAnalysis, documentId!, user.id);
    } catch (projectError) {
      console.warn('⚠️ Failed to link to Major Works project:', projectError);
      // Don't fail the entire request if project linking fails
    }

    // 7. Create Outlook calendar events and email drafts
    let outlookIntegration = null;
    try {
      outlookIntegration = await createOutlookIntegration(supabase, buildingId, majorWorksAnalysis, originalFilename);
    } catch (outlookError) {
      console.warn('⚠️ Outlook integration failed:', outlookError);
      // Don't fail the request if Outlook integration fails
    }

    // 8. Create audit trail
    try {
      await createMajorWorksAuditLog(supabase, {
        document_id: documentId!,
        building_id: parseInt(buildingId),
        user_id: user.id,
        action: 'document_uploaded',
        ai_analysis: majorWorksAnalysis,
        project_id: projectId
      });
    } catch (auditError) {
      console.warn('⚠️ Audit logging failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      type: 'major_works_upload',
      document: {
        id: documentId,
        filename: originalFilename,
        public_url: publicUrl,
        file_size: file.size
      },
      analysis: majorWorksAnalysis,
      project: {
        id: projectId,
        linked: !!projectId
      },
      outlook_integration: outlookIntegration,
      next_steps: generateNextSteps(majorWorksAnalysis)
    }, { headers });

  } catch (error) {
    console.error('❌ Major Works upload error:', error);
    return NextResponse.json({
      error: 'Failed to process Major Works document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers });
  }
}

// Extract text from Major Works document using existing OCR pipeline
async function extractTextFromMajorWorksDocument(file: File, characteristics: any): Promise<string> {
  // Try multiple extraction methods in priority order
  const methods = [
    'pdf_text_layer',
    'openai_extraction',
    'google_vision_ocr'
  ];

  for (const method of methods) {
    try {
      console.log(`🔍 Trying ${method} for Major Works document...`);

      let text = '';
      switch (method) {
        case 'pdf_text_layer':
          text = await extractTextFromPDF_TextLayer(file);
          break;
        case 'openai_extraction':
          text = await extractTextFromPDF_OpenAI(file);
          break;
        case 'google_vision_ocr':
          text = await extractTextFromPDF_GoogleVision(file);
          break;
      }

      if (text && text.trim().length > 50) {
        console.log(`✅ ${method} successful: ${text.length} characters`);
        return text;
      }

    } catch (error) {
      console.log(`❌ ${method} failed:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  throw new Error('All text extraction methods failed for Major Works document');
}

// Reuse extraction methods from upload-and-analyse
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

// AI Analysis specifically for Major Works documents
async function analyseMajorWorksDocument(text: string, filename: string, buildingId: string): Promise<MajorWorksAnalysis> {
  const prompt = `
You are analyzing a Major Works document for UK leasehold block management. Major Works are large-scale building projects that require Section 20 consultation with leaseholders.

Document: ${filename}
Building ID: ${buildingId}
Content: ${text.substring(0, 4000)}

Analyze this document and extract the following information in JSON format:

1. stage: Identify the Section 20 stage - one of:
   - "Notice of Intention" (initial notice to leaseholders about proposed works)
   - "Statement of Estimates" (detailed costs and contractor quotes)
   - "Award of Contract" (notification of selected contractor)
   - "Works Order" (formal instruction to commence works)
   - "Completion Certificate" (works completed notification)
   - "Final Account" (final costs and charges)
   - "Other" (if none of the above)

2. building_name: Extract the building name/address if mentioned

3. estimated_cost: Extract total estimated cost if mentioned (number only, no currency symbols)

4. contractors: Array of contractor names mentioned in the document

5. leaseholder_thresholds: Extract any mention of leaseholder contribution thresholds or caps (number only)

6. works_description: Brief description of the proposed/completed works

7. consultation_period_days: If mentioned, extract consultation period (usually 30 or 90 days)

8. start_date: Extract proposed/actual start date if mentioned (YYYY-MM-DD format)

9. completion_date: Extract expected/actual completion date if mentioned (YYYY-MM-DD format)

10. confidence: Your confidence in the classification (0-100)

Look specifically for:
- Section 20 terminology and references
- Consultation periods and deadlines
- Contractor names and quotes
- Cost breakdowns and leaseholder contributions
- Works specifications and timelines
- Legal notices and statutory requirements

Return only valid JSON with all fields included (use null for missing values).
`;

  try {
    console.log('🤖 Starting Major Works AI analysis...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Major Works specialist for UK leasehold management. Extract relevant information and return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      timeout: 60000
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI API');
    }

    console.log('✅ Major Works AI analysis completed');

    const analysis = JSON.parse(response);

    // Validate and return structured analysis
    return {
      stage: analysis.stage || MAJOR_WORKS_STAGES.OTHER,
      building_name: analysis.building_name || null,
      estimated_cost: analysis.estimated_cost ? parseFloat(analysis.estimated_cost) : null,
      contractors: Array.isArray(analysis.contractors) ? analysis.contractors : [],
      leaseholder_thresholds: analysis.leaseholder_thresholds ? parseFloat(analysis.leaseholder_thresholds) : null,
      works_description: analysis.works_description || null,
      consultation_period_days: analysis.consultation_period_days ? parseInt(analysis.consultation_period_days) : null,
      start_date: analysis.start_date || null,
      completion_date: analysis.completion_date || null,
      confidence: Math.min(100, Math.max(0, analysis.confidence || 50))
    };

  } catch (error) {
    console.error('❌ Major Works AI analysis error:', error);
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Link document to major_works_projects table
async function linkToMajorWorksProject(supabase: any, buildingId: string, analysis: MajorWorksAnalysis, documentId: string, userId: string): Promise<string | null> {
  // First, try to find existing project for this building
  const { data: existingProject } = await supabase
    .from('major_works_projects')
    .select('id, stage, title')
    .eq('building_id', parseInt(buildingId))
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let projectId: string;

  if (existingProject) {
    // Link to existing project
    projectId = existingProject.id;
    console.log('🔗 Linking to existing Major Works project:', projectId);

    // Update project with new stage if progressed
    if (shouldUpdateProjectStage(existingProject.stage, analysis.stage)) {
      await supabase
        .from('major_works_projects')
        .update({
          stage: analysis.stage,
          estimated_cost: analysis.estimated_cost || existingProject.estimated_cost,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);
    }

  } else {
    // Create new project
    console.log('🆕 Creating new Major Works project');

    const { data: newProject, error: projectError } = await supabase
      .from('major_works_projects')
      .insert({
        building_id: parseInt(buildingId),
        title: analysis.works_description || `Major Works - ${analysis.building_name || 'Building'}`,
        stage: analysis.stage,
        estimated_cost: analysis.estimated_cost,
        consultation_period_days: analysis.consultation_period_days,
        start_date: analysis.start_date,
        completion_date: analysis.completion_date,
        status: 'active',
        created_by: userId
      })
      .select('id')
      .single();

    if (projectError) {
      throw new Error(`Failed to create Major Works project: ${projectError.message}`);
    }

    projectId = newProject.id;
  }

  // Link document to project
  await supabase
    .from('major_works_documents')
    .insert({
      project_id: projectId,
      document_id: documentId,
      stage: analysis.stage,
      uploaded_by: userId
    });

  return projectId;
}

// Check if project stage should be updated based on document progression
function shouldUpdateProjectStage(currentStage: string, newStage: string): boolean {
  const stageOrder = [
    MAJOR_WORKS_STAGES.NOTICE_OF_INTENTION,
    MAJOR_WORKS_STAGES.STATEMENT_OF_ESTIMATES,
    MAJOR_WORKS_STAGES.AWARD_OF_CONTRACT,
    MAJOR_WORKS_STAGES.WORKS_ORDER,
    MAJOR_WORKS_STAGES.COMPLETION_CERTIFICATE,
    MAJOR_WORKS_STAGES.FINAL_ACCOUNT
  ];

  const currentIndex = stageOrder.indexOf(currentStage);
  const newIndex = stageOrder.indexOf(newStage);

  return newIndex > currentIndex;
}

// Create Outlook calendar events and email drafts
async function createOutlookIntegration(supabase: any, buildingId: string, analysis: MajorWorksAnalysis, filename: string) {
  const calendarEvents = [];
  const emailDrafts = [];

  try {
    // Get building info for context
    const { data: building } = await supabase
      .from('buildings')
      .select('name, address')
      .eq('id', parseInt(buildingId))
      .single();

    const buildingName = building?.name || analysis.building_name || 'Building';

    // Create calendar events based on stage
    switch (analysis.stage) {
      case MAJOR_WORKS_STAGES.NOTICE_OF_INTENTION:
        if (analysis.consultation_period_days) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + analysis.consultation_period_days);

          calendarEvents.push({
            subject: `Section 20 Notice Period Ends - ${buildingName}`,
            start: endDate.toISOString(),
            importance: 'high',
            body: `The Section 20 consultation period for ${buildingName} ends today. Review responses and proceed with next steps.`
          });
        }
        break;

      case MAJOR_WORKS_STAGES.STATEMENT_OF_ESTIMATES:
        const summaryDue = new Date();
        summaryDue.setDate(summaryDue.getDate() + 7); // 7 days to prepare summary

        calendarEvents.push({
          subject: `Leaseholder Summary Due - ${buildingName}`,
          start: summaryDue.toISOString(),
          importance: 'normal',
          body: `Prepare and send leaseholder summary for Major Works estimates at ${buildingName}.`
        });
        break;

      case MAJOR_WORKS_STAGES.AWARD_OF_CONTRACT:
        if (analysis.start_date) {
          calendarEvents.push({
            subject: `Works Start - ${buildingName}`,
            start: analysis.start_date,
            importance: 'high',
            body: `Major Works commence at ${buildingName}. Ensure site access and contractor coordination.`
          });
        }
        break;
    }

    // Create email draft for leaseholders
    const emailSubject = `Major Works - Section 20 ${analysis.stage} - ${buildingName}`;
    const emailBody = await generateMajorWorksEmailDraft(analysis, buildingName, filename);

    emailDrafts.push({
      to: 'leaseholders', // Placeholder - would be populated with actual addresses
      subject: emailSubject,
      body: emailBody,
      attachments: [filename]
    });

    return {
      calendar_events: calendarEvents,
      email_drafts: emailDrafts,
      created_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to create Outlook integration:', error);
    throw error;
  }
}

// Generate AI-powered email draft for leaseholders
async function generateMajorWorksEmailDraft(analysis: MajorWorksAnalysis, buildingName: string, filename: string): Promise<string> {
  const prompt = `
Generate a professional email for leaseholders regarding Major Works Section 20 consultation.

Building: ${buildingName}
Stage: ${analysis.stage}
Works: ${analysis.works_description || 'Major building works'}
Estimated Cost: ${analysis.estimated_cost ? `£${analysis.estimated_cost.toLocaleString()}` : 'TBC'}
Contractors: ${analysis.contractors.join(', ') || 'TBC'}
Consultation Period: ${analysis.consultation_period_days || 'Standard'} days

Create a clear, informative email that:
1. Explains the Section 20 process and leaseholder rights
2. Summarizes the proposed works and costs
3. Provides clear deadlines and next steps
4. Maintains professional tone appropriate for property management

Keep it concise but comprehensive. Include statutory requirements where relevant.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional property manager drafting Section 20 communications for leaseholders. Be clear, accurate, and helpful."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    return completion.choices[0]?.message?.content || 'Email draft could not be generated.';

  } catch (error) {
    console.error('❌ Failed to generate email draft:', error);
    return `Dear Leaseholder,

We are writing to inform you of ${analysis.stage} regarding Major Works at ${buildingName}.

Please find attached the relevant documentation: ${filename}

We will provide further details shortly.

Best regards,
Building Management`;
  }
}

// Create audit trail for Major Works actions
async function createMajorWorksAuditLog(supabase: any, logData: {
  document_id: string;
  building_id: number;
  user_id: string;
  action: string;
  ai_analysis: MajorWorksAnalysis;
  project_id?: string | null;
}) {
  await supabase
    .from('major_works_logs')
    .insert({
      document_id: logData.document_id,
      building_id: logData.building_id,
      user_id: logData.user_id,
      action: logData.action,
      details: {
        ai_classification: logData.ai_analysis.stage,
        ai_confidence: logData.ai_analysis.confidence,
        extracted_data: logData.ai_analysis,
        project_id: logData.project_id
      },
      created_at: new Date().toISOString()
    });
}

// Generate next steps based on analysis
function generateNextSteps(analysis: MajorWorksAnalysis): string[] {
  const steps = [];

  switch (analysis.stage) {
    case MAJOR_WORKS_STAGES.NOTICE_OF_INTENTION:
      steps.push('Wait for leaseholder consultation period to end');
      steps.push('Review any leaseholder responses or objections');
      steps.push('Prepare Statement of Estimates');
      break;

    case MAJOR_WORKS_STAGES.STATEMENT_OF_ESTIMATES:
      steps.push('Send summary to all leaseholders');
      steps.push('Allow consultation period for estimates');
      steps.push('Evaluate contractor proposals');
      break;

    case MAJOR_WORKS_STAGES.AWARD_OF_CONTRACT:
      steps.push('Notify all leaseholders of contract award');
      steps.push('Coordinate works commencement with contractor');
      steps.push('Schedule regular progress updates');
      break;

    case MAJOR_WORKS_STAGES.WORKS_ORDER:
      steps.push('Monitor works progress');
      steps.push('Manage site access and disruption');
      steps.push('Prepare interim reports for leaseholders');
      break;

    case MAJOR_WORKS_STAGES.COMPLETION_CERTIFICATE:
      steps.push('Conduct final inspection');
      steps.push('Prepare final account documentation');
      steps.push('Calculate final leaseholder charges');
      break;

    case MAJOR_WORKS_STAGES.FINAL_ACCOUNT:
      steps.push('Issue final charges to leaseholders');
      steps.push('Process payments and balances');
      steps.push('Close Major Works project');
      break;

    default:
      steps.push('Review document classification');
      steps.push('Determine appropriate next actions');
  }

  return steps;
}