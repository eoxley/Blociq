import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { analyzeDocument } from '@/lib/document-analysis-orchestrator';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userQuestion = formData.get('userQuestion') as string || 'Analyze this lease document';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('🧪 Testing OCR → AI flow for:', file.name);

    // Step 1: Process file through OCR
    const ocrFormData = new FormData();
    ocrFormData.append('file', file);
    
    const ocrResponse = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: ocrFormData
    });

    if (!ocrResponse.ok) {
      throw new Error(`OCR service error: ${ocrResponse.status}`);
    }

    const ocrResult = await ocrResponse.json();
    console.log('✅ OCR completed:', {
      textLength: ocrResult.text?.length || 0,
      confidence: ocrResult.confidence || 'unknown'
    });

    if (!ocrResult.text) {
      throw new Error('OCR failed to extract text');
    }

    // Step 2: Perform document analysis
    const analysis = await analyzeDocument(
      ocrResult.text, 
      file.name, 
      userQuestion
    );

    console.log('✅ Document analysis completed:', {
      documentType: analysis.documentType,
      hasExtractedText: !!analysis.extractedText,
      extractedTextLength: analysis.extractedText?.length || 0,
      aiPromptLength: analysis.aiPrompt?.length || 0
    });

    // Step 3: Return the full flow information
    return NextResponse.json({
      success: true,
      filename: file.name,
      ocrResult: {
        textLength: ocrResult.text.length,
        confidence: ocrResult.confidence,
        preview: ocrResult.text.substring(0, 500) + (ocrResult.text.length > 500 ? '...' : '')
      },
      documentAnalysis: {
        documentType: analysis.documentType,
        classification: analysis.classification,
        hasExtractedText: !!analysis.extractedText,
        extractedTextLength: analysis.extractedText?.length || 0,
        aiPromptLength: analysis.aiPrompt?.length || 0,
        aiPromptPreview: analysis.aiPrompt?.substring(0, 1000) + (analysis.aiPrompt && analysis.aiPrompt.length > 1000 ? '...' : '')
      },
      message: 'OCR → AI flow test completed successfully'
    });

  } catch (error) {
    console.error('❌ OCR → AI flow test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'OCR → AI flow test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OCR → AI Flow Test Endpoint',
    usage: 'POST with file and userQuestion to test the full OCR → AI flow',
    expectedFlow: [
      '1. File uploaded',
      '2. OCR processing via microservice',
      '3. Document analysis and classification',
      '4. AI prompt generation with extracted text',
      '5. Full flow verification'
    ]
  });
}
