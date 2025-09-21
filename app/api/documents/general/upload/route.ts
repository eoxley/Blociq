import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 180; // 3 minutes for upload and analysis

// General document types for flexible classification
const DOCUMENT_TYPES = {
  INSURANCE_POLICY: 'insurance_policy',
  MEETING_MINUTES: 'meeting_minutes',
  CONTRACT: 'contract',
  GENERAL_CORRESPONDENCE: 'general_correspondence',
  MAINTENANCE_REPORT: 'maintenance_report',
  FINANCIAL_STATEMENT: 'financial_statement',
  LEGAL_NOTICE: 'legal_notice',
  SURVEY_REPORT: 'survey_report',
  CONTRACTOR_QUOTE: 'contractor_quote',
  OTHER: 'other'
}

interface GeneralDocumentAnalysis {
  document_type: string;
  document_date?: string;
  expiry_date?: string;
  parties_involved: string[];
  keywords: string[];
  summary: string;
  confidence: number;
  metadata: Record<string, any>;
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

    console.log("📄 Processing General Document:", {
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
        { error: 'Building ID is required for document upload' },
        { status: 400, headers }
      )
    }

    // Validate file type - Support wide range of document types
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png', '.xlsx', '.xls'];

    if (!allowedMimeTypes.includes(file.type) &&
        !allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return NextResponse.json(
        {
          error: 'File type not supported',
          details: 'Supported types: PDF, Word, Excel, text files, and images',
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

    // 2. Upload to building_documents bucket with general path structure
    const timestamp = Date.now()
    const storagePath = `${buildingId}/general/${timestamp}_${originalFilename}`

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

    console.log("✅ General document uploaded:", publicUrl)

    // 3. Extract text using the existing OCR pipeline
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    let extractedText = '';

    try {
      // Reuse the intelligent OCR selection from upload-and-analyse
      const { analyzeFileCharacteristics } = await import('@/lib/ocr/intelligent-selection');
      const { getOrExtractText } = await import('@/lib/ocr/extraction-cache');

      const fileCharacteristics = await analyzeFileCharacteristics(file);

      const extractionResult = await getOrExtractText(fileBuffer, async () => {
        const startTime = Date.now();
        const text = await extractTextFromDocument(file, fileCharacteristics);
        const processingTime = Date.now() - startTime;

        return {
          text,
          method: 'general_document_extraction',
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

    console.log(`✅ Text extracted for General Document: ${extractedText.length} characters`);

    // 4. AI Analysis for flexible document classification
    let documentAnalysis: GeneralDocumentAnalysis;
    try {
      documentAnalysis = await analyseGeneralDocument(extractedText, originalFilename, buildingId);
    } catch (aiError) {
      console.error('❌ General Document AI analysis failed:', aiError);
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
          file_name: originalFilename,
          storage_path: storagePath,
          building_id: parseInt(buildingId),
          uploaded_by: user.id,
          document_type: documentAnalysis.document_type,
          category: 'general',
          file_size: file.size,
          ocr_status: 'completed',
          ocr_text: extractedText.substring(0, 65535), // Postgres TEXT limit
          metadata: {
            original_filename: originalFilename,
            public_url: publicUrl,
            file_type: file.type,
            document_date: documentAnalysis.document_date,
            expiry_date: documentAnalysis.expiry_date,
            parties_involved: documentAnalysis.parties_involved,
            keywords: documentAnalysis.keywords,
            summary: documentAnalysis.summary,
            ai_confidence: documentAnalysis.confidence,
            extracted_metadata: documentAnalysis.metadata
          }
        })
        .select('id')
        .single();

      if (docError) {
        console.error('❌ Failed to create document record:', docError);
        throw new Error(`Database error: ${docError.message}`);
      }

      documentId = documentData.id;
      console.log("✅ General document record created:", documentId);

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

    // 6. Create Outlook integration based on document type
    let outlookIntegration = null;
    try {
      outlookIntegration = await createOutlookIntegrationForDocument(
        supabase,
        buildingId,
        documentAnalysis,
        originalFilename,
        publicUrl,
        user.id
      );
    } catch (outlookError) {
      console.warn('⚠️ Outlook integration failed:', outlookError);
      // Don't fail the request if Outlook integration fails
    }

    // 7. Create comprehensive audit trail
    try {
      await createDocumentAuditLog(supabase, {
        document_id: documentId!,
        building_id: parseInt(buildingId),
        user_id: user.id,
        action: 'document_uploaded',
        document_type: documentAnalysis.document_type,
        ai_extraction_raw: extractedText,
        ai_analysis: documentAnalysis,
        outlook_event_id: outlookIntegration?.calendar_event_id,
        outlook_task_id: outlookIntegration?.task_id,
        outlook_email_draft_id: outlookIntegration?.email_draft_id
      });
    } catch (auditError) {
      console.warn('⚠️ Audit logging failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      type: 'general_document_upload',
      document: {
        id: documentId,
        filename: originalFilename,
        public_url: publicUrl,
        file_size: file.size,
        storage_path: storagePath
      },
      analysis: documentAnalysis,
      outlook_integration: outlookIntegration,
      next_steps: generateNextStepsForDocumentType(documentAnalysis.document_type, documentAnalysis)
    }, { headers });

  } catch (error) {
    console.error('❌ General Document upload error:', error);
    return NextResponse.json({
      error: 'Failed to process general document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers });
  }
}

// Extract text from general document using existing OCR pipeline
async function extractTextFromDocument(file: File, characteristics: any): Promise<string> {
  // Try multiple extraction methods in priority order
  const methods = [
    'pdf_text_layer',
    'openai_extraction',
    'google_vision_ocr'
  ];

  for (const method of methods) {
    try {
      console.log(`🔍 Trying ${method} for general document...`);

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

  throw new Error('All text extraction methods failed for general document');
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

// AI Analysis for flexible document classification
async function analyseGeneralDocument(text: string, filename: string, buildingId: string): Promise<GeneralDocumentAnalysis> {
  const prompt = `
You are analyzing a general document for UK leasehold block management. This could be any type of business document related to property management.

Document: ${filename}
Building ID: ${buildingId}
Content: ${text.substring(0, 4000)}

Analyze this document and extract the following information in JSON format:

1. document_type: Classify the document as one of:
   - "insurance_policy" (building insurance, liability insurance, etc.)
   - "meeting_minutes" (board meetings, AGM, EGM minutes)
   - "contract" (maintenance contracts, service agreements)
   - "general_correspondence" (letters, emails, notices)
   - "maintenance_report" (inspection reports, repair assessments)
   - "financial_statement" (accounts, budgets, financial reports)
   - "legal_notice" (court orders, legal correspondence)
   - "survey_report" (building surveys, condition assessments)
   - "contractor_quote" (quotes, estimates, proposals)
   - "other" (if none of the above fit)

2. document_date: Extract the document date if clearly mentioned (YYYY-MM-DD format or null)

3. expiry_date: Extract any expiry/renewal date if mentioned (YYYY-MM-DD format or null)
   - For insurance policies: renewal date
   - For contracts: end date
   - For certifications: expiry date

4. parties_involved: Array of companies, people, or organizations mentioned (max 5)

5. keywords: Array of important keywords/topics from the document (max 10)

6. summary: Brief summary of the document content (max 150 words)

7. confidence: Your confidence in the classification (0-100)

8. metadata: Object containing any additional relevant information based on document type:
   - For insurance: {policy_number, insurer, coverage_amount, premium}
   - For contracts: {contractor, service_type, value, duration}
   - For minutes: {meeting_type, attendees, key_decisions}
   - For quotes: {contractor, work_description, quoted_amount}

Look specifically for:
- Dates and deadlines
- Company names and contact details
- Financial amounts and policy numbers
- Renewal and expiry dates
- Key decisions or actions required

Return only valid JSON with all fields included (use null for missing values, empty arrays for no items).
`;

  try {
    console.log('🤖 Starting General Document AI analysis...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a document classification specialist for UK property management. Extract relevant information and return only valid JSON."
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

    console.log('✅ General Document AI analysis completed');

    const analysis = JSON.parse(response);

    // Validate and return structured analysis
    return {
      document_type: analysis.document_type || DOCUMENT_TYPES.OTHER,
      document_date: analysis.document_date || null,
      expiry_date: analysis.expiry_date || null,
      parties_involved: Array.isArray(analysis.parties_involved) ? analysis.parties_involved : [],
      keywords: Array.isArray(analysis.keywords) ? analysis.keywords : [],
      summary: analysis.summary || 'No summary available',
      confidence: Math.min(100, Math.max(0, analysis.confidence || 50)),
      metadata: analysis.metadata || {}
    };

  } catch (error) {
    console.error('❌ General Document AI analysis error:', error);
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Create Outlook integration based on document type
async function createOutlookIntegrationForDocument(
  supabase: any,
  buildingId: string,
  analysis: GeneralDocumentAnalysis,
  filename: string,
  publicUrl: string,
  userId: string
) {
  let calendarEventId = null;
  let taskId = null;
  let emailDraftId = null;

  try {
    // Get building info for context
    const { data: building } = await supabase
      .from('buildings')
      .select('name, address')
      .eq('id', parseInt(buildingId))
      .single();

    const buildingName = building?.name || `Building ${buildingId}`;

    // Handle different document types
    switch (analysis.document_type) {
      case DOCUMENT_TYPES.INSURANCE_POLICY:
        if (analysis.expiry_date) {
          // Create calendar reminder for insurance renewal
          const { data: calendarEvent } = await supabase
            .from('outlook_calendar_events')
            .insert({
              title: `📅 ${buildingName} Insurance Renewal`,
              description: `Insurance policy expires today. Review and renew.\n\nDocument: ${filename}\nInsurer: ${analysis.metadata.insurer || 'TBC'}\nPolicy: ${analysis.metadata.policy_number || 'TBC'}\n\nView document: ${publicUrl}`,
              start_time: analysis.expiry_date,
              end_time: analysis.expiry_date,
              reminder_minutes: [43200, 10080], // 30 days and 7 days before
              building_id: parseInt(buildingId),
              created_by: userId,
              event_type: 'insurance_renewal'
            })
            .select('id')
            .single();

          calendarEventId = calendarEvent?.id;
        }
        break;

      case DOCUMENT_TYPES.MEETING_MINUTES:
        // Auto-draft email to directors with minutes
        const { data: emailDraft } = await supabase
          .from('outlook_email_drafts')
          .insert({
            to_recipients: ['directors@building.com'], // Would be populated from building directors
            subject: `Minutes from ${analysis.document_date || 'Recent Meeting'} – ${buildingName}`,
            body: await generateMinutesEmailDraft(analysis, buildingName, filename, publicUrl),
            attachments: [{ name: filename, url: publicUrl }],
            building_id: parseInt(buildingId),
            created_by: userId,
            draft_type: 'meeting_minutes'
          })
          .select('id')
          .single();

        emailDraftId = emailDraft?.id;
        break;

      case DOCUMENT_TYPES.CONTRACT:
        // Create Outlook task for contract review
        const reviewDate = new Date();
        reviewDate.setDate(reviewDate.getDate() + 14); // 14 days default

        const { data: outlookTask } = await supabase
          .from('outlook_tasks')
          .insert({
            title: `Review Contract – ${analysis.metadata.contractor || 'Contractor'}`,
            description: `Review contract details and terms.\n\nDocument: ${filename}\nContractor: ${analysis.metadata.contractor || 'TBC'}\nService: ${analysis.metadata.service_type || 'TBC'}\nValue: ${analysis.metadata.value || 'TBC'}\n\nView document: ${publicUrl}`,
            due_date: analysis.expiry_date || reviewDate.toISOString().split('T')[0],
            priority: 'normal',
            building_id: parseInt(buildingId),
            assigned_to: userId,
            task_type: 'contract_review'
          })
          .select('id')
          .single();

        taskId = outlookTask?.id;
        break;

      case DOCUMENT_TYPES.CONTRACTOR_QUOTE:
        // Create task to review and compare quotes
        const quoteReviewDate = new Date();
        quoteReviewDate.setDate(quoteReviewDate.getDate() + 7); // 7 days for quote review

        const { data: quoteTask } = await supabase
          .from('outlook_tasks')
          .insert({
            title: `Review Quote – ${analysis.metadata.contractor || 'Contractor'}`,
            description: `Review contractor quote and compare with others.\n\nDocument: ${filename}\nContractor: ${analysis.metadata.contractor || 'TBC'}\nWork: ${analysis.metadata.work_description || 'TBC'}\nAmount: ${analysis.metadata.quoted_amount || 'TBC'}\n\nView document: ${publicUrl}`,
            due_date: quoteReviewDate.toISOString().split('T')[0],
            priority: 'normal',
            building_id: parseInt(buildingId),
            assigned_to: userId,
            task_type: 'quote_review'
          })
          .select('id')
          .single();

        taskId = quoteTask?.id;
        break;

      default:
        // For other document types, create a general review reminder if there's an expiry date
        if (analysis.expiry_date) {
          const { data: generalEvent } = await supabase
            .from('outlook_calendar_events')
            .insert({
              title: `📋 ${buildingName} Document Review Required`,
              description: `Document requires attention.\n\nDocument: ${filename}\nType: ${analysis.document_type}\nSummary: ${analysis.summary}\n\nView document: ${publicUrl}`,
              start_time: analysis.expiry_date,
              end_time: analysis.expiry_date,
              reminder_minutes: [1440], // 1 day before
              building_id: parseInt(buildingId),
              created_by: userId,
              event_type: 'document_review'
            })
            .select('id')
            .single();

          calendarEventId = generalEvent?.id;
        }
        break;
    }

    return {
      calendar_event_id: calendarEventId,
      task_id: taskId,
      email_draft_id: emailDraftId,
      created_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to create Outlook integration:', error);
    throw error;
  }
}

// Generate email draft for meeting minutes
async function generateMinutesEmailDraft(analysis: GeneralDocumentAnalysis, buildingName: string, filename: string, documentUrl: string): Promise<string> {
  const prompt = `
Generate a professional email to building directors regarding meeting minutes.

Building: ${buildingName}
Meeting Date: ${analysis.document_date || 'Recent'}
Summary: ${analysis.summary}
Key Keywords: ${analysis.keywords.join(', ')}

Create a clear, professional email that:
1. Announces the availability of the minutes
2. Highlights key decisions and actions
3. Provides clear next steps if any
4. Maintains professional tone for property management

Keep it concise but informative.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional property manager drafting communications for building directors. Be clear, accurate, and helpful."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 600
    });

    return completion.choices[0]?.message?.content || `Dear Directors,

Please find attached the minutes from the recent meeting held on ${analysis.document_date || 'recent date'}.

${analysis.summary}

Please review and let us know if you have any questions or concerns.

Best regards,
Building Management

Document: ${filename}
View online: ${documentUrl}`;

  } catch (error) {
    console.error('❌ Failed to generate email draft:', error);
    return `Dear Directors,

Please find attached the minutes from the recent meeting.

The document has been uploaded to the building management system for your review.

Best regards,
Building Management

Document: ${filename}
View online: ${documentUrl}`;
  }
}

// Create comprehensive audit trail for document uploads
async function createDocumentAuditLog(supabase: any, logData: {
  document_id: string;
  building_id: number;
  user_id: string;
  action: string;
  document_type: string;
  ai_extraction_raw: string;
  ai_analysis: GeneralDocumentAnalysis;
  outlook_event_id?: string | null;
  outlook_task_id?: string | null;
  outlook_email_draft_id?: string | null;
}) {
  await supabase
    .from('document_logs')
    .insert({
      document_id: logData.document_id,
      building_id: logData.building_id,
      user_id: logData.user_id,
      action: logData.action,
      document_type: logData.document_type,
      ai_extraction_raw: logData.ai_extraction_raw.substring(0, 65535), // Postgres TEXT limit
      ai_analysis: logData.ai_analysis,
      outlook_event_id: logData.outlook_event_id,
      outlook_task_id: logData.outlook_task_id,
      outlook_email_draft_id: logData.outlook_email_draft_id,
      created_at: new Date().toISOString()
    });
}

// Generate next steps based on document type
function generateNextStepsForDocumentType(documentType: string, analysis: GeneralDocumentAnalysis): string[] {
  const steps = [];

  switch (documentType) {
    case DOCUMENT_TYPES.INSURANCE_POLICY:
      steps.push('Review policy terms and coverage');
      steps.push('Set calendar reminder for renewal date');
      if (analysis.expiry_date) {
        steps.push(`Policy expires on ${analysis.expiry_date} - prepare for renewal`);
      }
      steps.push('Compare with other insurance quotes if renewal approaching');
      break;

    case DOCUMENT_TYPES.MEETING_MINUTES:
      steps.push('Review minutes for accuracy');
      steps.push('Distribute to all relevant parties');
      steps.push('Follow up on action items identified');
      steps.push('File in building records');
      break;

    case DOCUMENT_TYPES.CONTRACT:
      steps.push('Review contract terms and conditions');
      steps.push('Verify contractor credentials and insurance');
      steps.push('Set up performance monitoring');
      if (analysis.expiry_date) {
        steps.push(`Contract expires on ${analysis.expiry_date} - plan renewal`);
      }
      break;

    case DOCUMENT_TYPES.CONTRACTOR_QUOTE:
      steps.push('Compare with other quotes received');
      steps.push('Verify contractor credentials');
      steps.push('Check references and previous work');
      steps.push('Schedule site visit if required');
      break;

    case DOCUMENT_TYPES.MAINTENANCE_REPORT:
      steps.push('Review maintenance recommendations');
      steps.push('Prioritize urgent repairs');
      steps.push('Obtain quotes for recommended work');
      steps.push('Schedule necessary maintenance');
      break;

    case DOCUMENT_TYPES.FINANCIAL_STATEMENT:
      steps.push('Review financial position and variances');
      steps.push('Identify any areas of concern');
      steps.push('Prepare summary for directors');
      steps.push('Plan budget adjustments if needed');
      break;

    default:
      steps.push('Review document content');
      steps.push('Determine required actions');
      steps.push('Notify relevant parties if needed');
      steps.push('File in appropriate category');
  }

  return steps;
}