import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from "next/headers";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    console.log("📎 Uploading compliance document with AI processing...");
    
    const supabase = createClient(await cookies());
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Parse the request body
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildingId = formData.get('buildingId') as string;
    const assetId = formData.get('assetId') as string;
    const originalFilename = formData.get('originalFilename') as string;

    if (!file || !assetId || !buildingId) {
      return NextResponse.json({ 
        error: "Missing required fields: file, buildingId, and assetId are required" 
      }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Allowed types: PDF, JPEG, PNG, GIF, DOC, DOCX" 
      }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 10MB" 
      }, { status: 400 });
    }

    console.log(`📄 Processing file: ${originalFilename || file.name}`);

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

    // Basic filename-based classification with asset context
    let initialClassification = classifyDocumentByFilename(file.name, assetInfo?.category);
    console.log(`🤖 Initial classification: ${initialClassification.documentType} (${initialClassification.confidence}% confidence)`);

    // Upload file to Supabase Storage
    const fileNameStorage = `compliance/${buildingId}/${assetId}/${Date.now()}-${originalFilename || file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(fileNameStorage, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("❌ File upload failed:", uploadError);
      return NextResponse.json({ 
        error: "Failed to upload file",
        details: uploadError.message 
      }, { status: 500 });
    }

    console.log("✅ File uploaded to storage:", fileNameStorage);

    // Save document record to new compliance_documents table
    const { data: document, error: documentError } = await supabase
      .from("compliance_documents")
      .insert({
        building_compliance_asset_id: bcaData.id,
        building_id: buildingId,
        file_path: fileNameStorage,
        original_filename: originalFilename || file.name,
        file_type: file.type,
        file_size: file.size,
        document_type: initialClassification.documentType,
        document_category: initialClassification.category,
        ai_confidence_score: initialClassification.confidence,
        uploaded_by_user_id: user.id,
        processing_status: 'pending'
      })
      .select()
      .single();

    if (documentError) {
      console.error("❌ Failed to save document record:", documentError);
      return NextResponse.json({ 
        error: "Failed to save document record",
        details: documentError.message 
      }, { status: 500 });
    }

    console.log("✅ Compliance document uploaded successfully:", document.id);

    // Start AI processing in background
    console.log("🤖 Starting AI document processing...");
    const aiProcessingPromise = processDocumentWithAI(document, file, assetInfo);

    // Update processing status to 'processing'
    await supabase
      .from("compliance_documents")
      .update({ processing_status: 'processing', processed_date: new Date().toISOString() })
      .eq('id', document.id);

    // Get public URL for response
    const { data: { publicUrl } } = supabase.storage
      .from('compliance-documents')
      .getPublicUrl(fileNameStorage);

    // Process AI in background but don't wait for it
    aiProcessingPromise.catch(error => {
      console.error("❌ AI processing failed:", error);
      // Update status to failed in background
      supabase
        .from("compliance_documents")
        .update({ processing_status: 'failed' })
        .eq('id', document.id)
        .then(() => console.log("📝 Updated document status to failed"));
    });

    const responseData = {
      message: "Compliance document uploaded successfully",
      documentId: document.id,
      document: {
        id: document.id,
        filename: originalFilename || file.name,
        file_path: fileNameStorage,
        file_url: publicUrl,
        file_size: file.size,
        uploaded_at: document.upload_date,
        building_id: document.building_id,
        building_compliance_asset_id: document.building_compliance_asset_id,
        processing_status: 'processing'
      },
      aiClassification: {
        documentType: initialClassification.documentType,
        category: initialClassification.category,
        confidence: initialClassification.confidence
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        file_name: fileNameStorage,
        asset_context: `${assetInfo?.name} (${assetInfo?.category})`
      }
    };

    console.log("🎉 Compliance document upload completed successfully");

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Compliance document upload error:", error);
    return NextResponse.json({ 
      error: "Internal server error during document upload",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// AI Processing Functions
function classifyDocumentByFilename(filename: string, assetCategory?: string): {
  documentType: string;
  category: string;
  confidence: number;
} {
  const lowerName = filename.toLowerCase();
  
  // Asset-specific classification patterns
  const assetPatterns: { [key: string]: string[] } = {
    'electrical': ['eicr', 'electrical', 'inspection', 'condition', 'report'],
    'gas': ['gas', 'safety', 'cp12', 'landlord'],
    'fire': ['fire', 'risk', 'assessment', 'fra'],
    'legionella': ['legionella', 'water', 'risk'],
    'asbestos': ['asbestos', 'survey', 'management'],
    'lift': ['lift', 'thorough', 'examination', 'loler'],
    'boiler': ['boiler', 'service', 'maintenance'],
    'pat': ['pat', 'portable', 'appliance', 'testing']
  };

  // Document type patterns
  const typePatterns = {
    'Certificate': ['certificate', 'cert', 'cp12', 'eicr'],
    'Report': ['report', 'assessment', 'survey'],
    'Inspection Report': ['inspection', 'thorough', 'examination'],
    'Test Certificate': ['test', 'pat', 'testing'],
    'Invoice': ['invoice', 'bill', 'payment'],
    'Quote/Estimate': ['quote', 'estimate', 'quotation'],
    'Remedial Work': ['remedial', 'repair', 'fix', 'works'],
    'Photo Evidence': ['photo', 'image', 'picture', 'jpeg', 'jpg', 'png']
  };

  let bestMatch = { type: 'Certificate', category: 'Current Certificate', confidence: 30 };

  // Check asset-specific patterns first
  if (assetCategory) {
    const patterns = assetPatterns[assetCategory.toLowerCase()];
    if (patterns && patterns.some(pattern => lowerName.includes(pattern))) {
      bestMatch.confidence += 40;
    }
  }

  // Check document type patterns
  for (const [type, patterns] of Object.entries(typePatterns)) {
    const matchCount = patterns.filter(pattern => lowerName.includes(pattern)).length;
    if (matchCount > 0) {
      bestMatch.type = type;
      bestMatch.confidence += matchCount * 20;
      break;
    }
  }

  // Determine category based on type
  const category = bestMatch.type.includes('Certificate') ? 'Current Certificate' :
                   bestMatch.type.includes('Report') ? 'Assessment Report' :
                   bestMatch.type.includes('Photo') ? 'Supporting Photos' :
                   'Supporting Documents';

  return {
    documentType: bestMatch.type,
    category,
    confidence: Math.min(bestMatch.confidence, 95) // Cap confidence at 95%
  };
}

async function processDocumentWithAI(document: any, file: File, assetInfo: any): Promise<void> {
  const supabase = createClient(await cookies());
  
  try {
    console.log(`🧠 Starting AI processing for document ${document.id}`);

    // Only process images and PDFs with OCR
    const shouldOCR = file.type.startsWith('image/') || file.type === 'application/pdf';
    
    let extractedData: any = {};
    let ocrText = '';

    if (shouldOCR) {
      // Send to OCR service
      console.log("📖 Sending document for OCR processing...");
      const ocrResult = await performOCR(file);
      ocrText = ocrResult.text || '';
      
      // Extract structured data from OCR text
      extractedData = extractDataFromOCRText(ocrText, assetInfo);
      
      console.log(`📋 Extracted data: ${Object.keys(extractedData).length} fields`);
    }

    // Enhanced classification based on OCR content
    let enhancedClassification = document.document_type;
    let enhancedCategory = document.document_category;
    let enhancedConfidence = document.ai_confidence_score;

    if (ocrText) {
      const ocrClassification = classifyDocumentByContent(ocrText, assetInfo?.category);
      if (ocrClassification.confidence > enhancedConfidence) {
        enhancedClassification = ocrClassification.documentType;
        enhancedCategory = ocrClassification.category;
        enhancedConfidence = ocrClassification.confidence;
        
        console.log(`🎯 Enhanced classification: ${enhancedClassification} (${enhancedConfidence}%)`);
      }
    }

    // Update document with enhanced classification
    await supabase
      .from("compliance_documents")
      .update({
        document_type: enhancedClassification,
        document_category: enhancedCategory,
        ai_confidence_score: enhancedConfidence,
        processing_status: 'completed'
      })
      .eq('id', document.id);

    // Save AI extraction data
    const { error: extractionError } = await supabase
      .from("ai_document_extractions")
      .insert({
        document_id: document.id,
        extracted_data: extractedData,
        confidence_scores: {},
        inspection_date: extractedData.inspection_date || null,
        next_due_date: extractedData.next_due_date || null,
        inspector_name: extractedData.inspector_name || null,
        inspector_company: extractedData.inspector_company || null,
        certificate_number: extractedData.certificate_number || null,
        property_address: extractedData.property_address || null,
        compliance_status: extractedData.compliance_status || null,
        ai_model_version: 'v1.0',
        processing_time_ms: Date.now() % 10000 // Simplified timing
      });

    if (extractionError) {
      console.error("❌ Failed to save extraction data:", extractionError);
    } else {
      console.log("✅ AI extraction data saved successfully");
    }

    console.log(`🎉 AI processing completed for document ${document.id}`);

  } catch (error) {
    console.error(`❌ AI processing failed for document ${document.id}:`, error);
    
    // Update status to failed
    await supabase
      .from("compliance_documents")
      .update({ processing_status: 'failed' })
      .eq('id', document.id);
    
    throw error;
  }
}

async function performOCR(file: File): Promise<{ text: string }> {
  console.log("🔍 Performing enhanced OCR with fallback system...");
  
  // Try external OCR server first
  try {
    console.log("📡 Trying external OCR server...");
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'BlocIQ-OCR-Client/1.0'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ External OCR processing completed");
      return { text: result.text || '' };
    } else {
      console.warn(`⚠️ External OCR failed with status ${response.status}`);
      throw new Error(`External OCR failed: ${response.status}`);
    }
  } catch (externalError) {
    console.warn("⚠️ External OCR failed, trying OpenAI Vision fallback...", externalError);
  }

  // Fallback to OpenAI Vision API
  if (process.env.OPENAI_API_KEY && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
    try {
      console.log("🤖 Using OpenAI Vision API fallback...");
      
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all text from this compliance document. Focus on dates, inspector names, certificate numbers, and compliance status. Return only the text content, no explanations.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${file.type};base64,${base64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
          temperature: 0
        }),
      });

      if (openAIResponse.ok) {
        const result = await openAIResponse.json();
        const extractedText = result.choices?.[0]?.message?.content || '';
        console.log("✅ OpenAI Vision OCR completed");
        return { text: extractedText };
      } else {
        throw new Error(`OpenAI Vision API failed: ${openAIResponse.status}`);
      }
    } catch (openaiError) {
      console.error("❌ OpenAI Vision fallback failed:", openaiError);
    }
  }

  console.warn("⚠️ All OCR methods failed, returning empty text");
  return { text: '' };
}

function extractDataFromOCRText(ocrText: string, assetInfo: any): any {
  const extracted: any = {};
  const text = ocrText.toLowerCase();

  // Extract dates
  const datePatterns = [
    /(?:inspection|test|issue|expiry|due).*?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g
  ];

  for (const pattern of datePatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      // Try to parse the first date found
      try {
        const dateStr = matches[0][1];
        const parsed = new Date(dateStr.replace(/[-\.]/g, '/'));
        if (!isNaN(parsed.getTime())) {
          if (text.includes('expiry') || text.includes('due')) {
            extracted.next_due_date = parsed.toISOString().split('T')[0];
          } else {
            extracted.inspection_date = parsed.toISOString().split('T')[0];
          }
        }
      } catch (e) {
        console.warn("Date parsing failed:", e);
      }
    }
  }

  // Extract names and companies
  const namePattern = /(?:inspector|engineer|surveyor).*?([A-Z][a-z]+ [A-Z][a-z]+)/gi;
  const nameMatch = namePattern.exec(text);
  if (nameMatch) {
    extracted.inspector_name = nameMatch[1];
  }

  // Extract certificate numbers
  const certPattern = /(?:certificate|cert|ref|no).*?([A-Z0-9\-\/]{6,})/gi;
  const certMatch = certPattern.exec(text);
  if (certMatch) {
    extracted.certificate_number = certMatch[1];
  }

  // Extract compliance status
  if (text.includes('pass') && !text.includes('fail')) {
    extracted.compliance_status = 'Pass';
  } else if (text.includes('fail')) {
    extracted.compliance_status = 'Fail';
  } else if (text.includes('satisfactory')) {
    extracted.compliance_status = 'Pass';
  } else if (text.includes('unsatisfactory')) {
    extracted.compliance_status = 'Fail';
  }

  return extracted;
}

function classifyDocumentByContent(text: string, assetCategory?: string): {
  documentType: string;
  category: string;
  confidence: number;
} {
  const lowerText = text.toLowerCase();
  
  // Content-based classification patterns
  const contentPatterns = {
    'EICR Certificate': {
      patterns: ['electrical installation condition report', 'eicr', 'inspection and testing'],
      confidence: 90
    },
    'Gas Safety Certificate': {
      patterns: ['gas safety record', 'cp12', 'landlord gas safety certificate'],
      confidence: 90
    },
    'Fire Risk Assessment': {
      patterns: ['fire risk assessment', 'fra', 'fire safety'],
      confidence: 85
    },
    'PAT Test Certificate': {
      patterns: ['portable appliance test', 'pat test', 'pat testing'],
      confidence: 85
    },
    'Legionella Risk Assessment': {
      patterns: ['legionella', 'water risk assessment', 'l8'],
      confidence: 80
    }
  };

  let bestMatch = { documentType: 'Certificate', category: 'Current Certificate', confidence: 50 };

  for (const [docType, config] of Object.entries(contentPatterns)) {
    const matchCount = config.patterns.filter(pattern => lowerText.includes(pattern)).length;
    if (matchCount > 0) {
      const confidence = config.confidence + (matchCount - 1) * 5; // Bonus for multiple matches
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          documentType: docType,
          category: 'Current Certificate',
          confidence: Math.min(confidence, 95)
        };
      }
    }
  }

  return bestMatch;
} 