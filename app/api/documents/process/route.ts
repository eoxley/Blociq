import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { extractTextFromPDFWithValidation } from '@/lib/extractTextFromPdf';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📄 Starting document processing...');

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const buildingId = formData.get('buildingId') as string;
    const documentType = formData.get('documentType') as string;
    const fileName = formData.get('fileName') as string;

    if (!file || !buildingId || !documentType || !fileName) {
      return NextResponse.json({ 
        error: 'Missing required fields: file, buildingId, documentType, fileName' 
      }, { status: 400 });
    }

    console.log('📋 Document details:', {
      fileName,
      documentType,
      buildingId,
      fileSize: file.size,
      fileType: file.type
    });

    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload PDF or image files.' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Extract text from document
    let extractedText: string;
    let extractionMethod: string;
    let extractionConfidence: number;

    if (file.type.includes('pdf')) {
      console.log('📄 Processing PDF document...');
      const extractionResult = await extractTextFromPDFWithValidation(fileBuffer);
      extractedText = extractionResult.text;
      extractionMethod = extractionResult.method;
      extractionConfidence = extractionResult.confidence;
    } else {
      // For images, we'll use OCR directly
      console.log('🖼️ Processing image document...');
      const { ocrWithGoogleVision } = await import('@/lib/ocr');
      extractedText = await ocrWithGoogleVision(fileBuffer);
      extractionMethod = 'ocr';
      extractionConfidence = 0.7;
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json({ 
        error: 'Unable to extract meaningful text from the document. Please ensure the document contains readable text.' 
      }, { status: 400 });
    }

    console.log('✅ Text extraction successful:', {
      method: extractionMethod,
      confidence: extractionConfidence,
      textLength: extractedText.length
    });

    // Generate AI summary
    console.log('🤖 Generating AI summary...');
    const summary = await generateDocumentSummary(extractedText, documentType, fileName);

    // Upload file to Supabase Storage
    console.log('📤 Uploading file to storage...');
    const filePath = `documents/${buildingId}/${Date.now()}_${fileName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('building-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ File upload failed:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file to storage' 
      }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('building-documents')
      .getPublicUrl(filePath);

    // Save document metadata and extracted text to database
    console.log('💾 Saving document to database...');
    const { data: documentData, error: dbError } = await supabase
      .from('building_documents')
      .insert({
        building_id: buildingId,
        file_name: fileName,
        file_url: publicUrl,
        type: documentType,
        text_content: extractedText,
        summary: summary,
        extraction_method: extractionMethod,
        extraction_confidence: extractionConfidence,
        file_size: file.size,
        uploaded_by: session.user.id
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database save failed:', dbError);
      return NextResponse.json({ 
        error: 'Failed to save document to database' 
      }, { status: 500 });
    }

    console.log('✅ Document processing completed successfully');

    return NextResponse.json({
      success: true,
      document: {
        id: documentData.id,
        fileName: documentData.file_name,
        documentType: documentData.type,
        summary: documentData.summary,
        extractionMethod: documentData.extraction_method,
        extractionConfidence: documentData.extraction_confidence,
        textLength: extractedText.length,
        fileUrl: documentData.file_url
      },
      message: 'Document processed and saved successfully'
    });

  } catch (error) {
    console.error('❌ Document processing error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during document processing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function generateDocumentSummary(
  text: string, 
  documentType: string, 
  fileName: string
): Promise<string> {
  try {
    const prompt = `You are a UK property management expert. Please analyze this ${documentType} document and provide a comprehensive summary.

Document: ${fileName}
Type: ${documentType}

Document Content:
${text.substring(0, 8000)} // Limit to prevent token overflow

Please provide a structured summary that includes:
1. Document purpose and key findings
2. Compliance implications (if any)
3. Action items or recommendations
4. Important dates or deadlines
5. Relevant UK legislation references

Focus on UK property management context and leasehold terminology. Be specific and actionable.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    });

    return response.choices[0].message?.content || 'Summary generation failed';
  } catch (error) {
    console.error('❌ AI summary generation failed:', error);
    return 'Summary generation failed due to technical issues';
  }
} 