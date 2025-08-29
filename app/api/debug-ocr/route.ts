import { NextRequest, NextResponse } from 'next/server';
import { processFileWithOCR, getOCRConfig } from '@/lib/ai/ocrClient';

export async function POST(request: NextRequest) {
  console.log('🧪 Debug OCR endpoint called');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }
    
    console.log(`📄 Testing OCR with file: ${file.name}, size: ${file.size} bytes`);
    
    // Test the OCR service directly
    const ocrConfig = getOCRConfig();
    console.log('🔧 OCR Config:', ocrConfig);
    
    const result = await processFileWithOCR(file, ocrConfig);
    
    console.log('🔍 OCR Result:', {
      success: result.success,
      textLength: result.text?.length || 0,
      confidence: result.confidence,
      error: result.error,
      metadata: result.metadata
    });
    
    return NextResponse.json({
      success: result.success,
      textLength: result.text?.length || 0,
      textPreview: result.text?.substring(0, 500),
      confidence: result.confidence,
      error: result.error,
      metadata: result.metadata,
      config: ocrConfig
    });
    
  } catch (error) {
    console.error('❌ Debug OCR error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OCR Debug endpoint - POST a file to test OCR functionality',
    endpoint: 'POST /api/debug-ocr with file in FormData'
  });
}