import { NextRequest, NextResponse } from 'next/server';

// Google Document AI processing function
async function processDocumentWithGoogleAI(fileBuffer: Buffer, filename: string) {
  try {
    // Load configuration
    const config = require('../../../lib/ocr/document-ai-config');
    const client = config.google.getDocumentAIClient();
    
    // You'll need to create a processor first - see setup script
    const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
    
    if (!processorId) {
      throw new Error('DOCUMENT_AI_PROCESSOR_ID not configured');
    }
    
    const name = client.processorPath(
      config.google.projectId,
      config.google.location,
      processorId
    );

    const request = {
      name,
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    };

    console.log('Processing with Google Document AI...');
    const [result] = await client.processDocument(request);
    
    return {
      success: true,
      extractedText: result.document.text,
      confidence: Math.round((result.document.pages?.[0]?.confidence || 0.8) * 100),
      ocrSource: 'google_document_ai',
      structuredData: extractLeaseFields(result.document.text),
      filename: filename
    };
    
  } catch (error) {
    console.error('Google Document AI failed:', error);
    
    // Return failure response matching your expected format
    return {
      success: false,
      extractedText: '',
      confidence: 0,
      ocrSource: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      filename: filename
    };
  }
}

// Basic lease data extraction
function extractLeaseFields(text: string) {
  const fields: { [key: string]: string } = {};
  
  // Extract common lease information using regex
  const patterns = {
    lessor: /(?:lessor|landlord)[\s:]+([^\n]+)/gi,
    lessee: /(?:lessee|tenant)[\s:]+([^\n]+)/gi,
    property: /(?:property|premises)[\s:]+([^\n]+)/gi,
    rent: /(?:rent|rental)[\s:]+£?([\d,]+(?:\.\d{2})?)/gi,
    premium: /premium[\s:]+£?([\d,]+(?:\.\d{2})?)/gi,
    term: /(?:term|period)[\s:]+(\d+)\s*years?/gi
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = pattern.exec(text);
    if (match) {
      fields[key] = match[1].trim();
    }
  }
  
  return fields;
}

export async function POST(request: NextRequest) {
  console.log('🚀 Google Document AI OCR endpoint called');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`📄 Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process with Google Document AI
    const result = await processDocumentWithGoogleAI(buffer, file.name);
    
    console.log(`✅ Document AI OCR completed: ${result.success ? 'Success' : 'Failed'}`);

    return NextResponse.json({
      ...result,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('❌ Document AI OCR processing failed:', error);
    return NextResponse.json({
      error: 'OCR processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}