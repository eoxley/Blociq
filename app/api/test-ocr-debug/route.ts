import { NextRequest, NextResponse } from 'next/server';
import { processFileWithOCR, getOCRConfig } from '@/lib/ai/ocrClient';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log('🔍 Testing OCR with file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Test 1: Direct OCR
    console.log('🧪 Test 1: Direct OCR processing...');
    const ocrConfig = getOCRConfig();
    const ocrResult = await processFileWithOCR(file, ocrConfig);
    
    console.log('📊 OCR Result:', {
      success: ocrResult.success,
      textLength: ocrResult.text?.length || 0,
      confidence: ocrResult.confidence,
      error: ocrResult.error,
      metadata: ocrResult.metadata
    });
    
    // Test 2: File buffer analysis
    console.log('🧪 Test 2: File buffer analysis...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('📊 Buffer analysis:', {
      bufferLength: buffer.length,
      firstBytes: buffer.slice(0, 20).toString('hex'),
      isPDF: buffer.slice(0, 4).toString() === '%PDF'
    });
    
    // Test 3: Try local PDF extraction
    console.log('🧪 Test 3: Local PDF extraction...');
    let localResult = null;
    try {
      const { extractText } = await import('@/lib/extractTextFromPdf');
      const text = await extractText(new Uint8Array(buffer), file.name);
      localResult = { success: true, text: text.substring(0, 200), length: text.length };
    } catch (error) {
      localResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    console.log('📊 Local extraction result:', localResult);
    
    return NextResponse.json({
      success: true,
      tests: {
        ocr: ocrResult,
        buffer: {
          length: buffer.length,
          isPDF: buffer.slice(0, 4).toString() === '%PDF',
          firstBytes: buffer.slice(0, 20).toString('hex')
        },
        local: localResult
      }
    });
    
  } catch (error) {
    console.error('Test OCR debug error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
