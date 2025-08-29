import { NextRequest, NextResponse } from 'next/server';
import { processFileWithOCR, getOCRConfig } from '@/lib/ai/ocrClient';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log('🧪 DIRECT OCR TEST - File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Test 1: Direct OCR processing (using the actual exported function)
    console.log('🧪 Test 1: Direct OCR processing...');
    let ocrResult = null;
    try {
      const ocrConfig = getOCRConfig();
      ocrResult = await processFileWithOCR(file, ocrConfig);
      console.log('✅ OCR processing completed');
    } catch (error) {
      console.error('❌ OCR processing failed:', error);
      ocrResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // Test 2: File buffer analysis
    console.log('🧪 Test 2: File buffer analysis...');
    let bufferInfo = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      bufferInfo = {
        bufferLength: buffer.length,
        isPDF: buffer.slice(0, 4).toString() === '%PDF',
        firstBytes: buffer.slice(0, 20).toString('hex'),
        firstChars: buffer.slice(0, 20).toString()
      };
    } catch (error) {
      bufferInfo = { error: error instanceof Error ? error.message : 'Buffer analysis failed' };
    }
    
    // Test 3: Direct PDF extraction
    console.log('🧪 Test 3: Direct PDF extraction...');
    let pdfResult = null;
    try {
      const { extractText } = await import('@/lib/extractTextFromPdf');
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractText(new Uint8Array(arrayBuffer), file.name);
      pdfResult = {
        success: true,
        textLength: text?.text?.length || 0,
        textPreview: text?.text?.substring(0, 200) || 'No text',
        hasText: !!text?.text
      };
    } catch (error) {
      pdfResult = {
        success: false,
        error: error instanceof Error ? error.message : 'PDF extraction failed'
      };
    }
    
    // Test 4: OCR Fallback System
    console.log('🧪 Test 4: OCR Fallback System...');
    let fallbackResult = null;
    try {
      const { processDocumentWithFallback } = await import('@/lib/ocr-fallback');
      const result = await processDocumentWithFallback(file);
      fallbackResult = {
        success: true,
        textLength: result?.text?.length || 0,
        method: result?.method,
        attempts: result?.attempts,
        fallbackReasons: result?.fallbackReasons
      };
    } catch (error) {
      fallbackResult = {
        success: false,
        error: error instanceof Error ? error.message : 'OCR fallback failed'
      };
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        directOCR: ocrResult,
        bufferAnalysis: bufferInfo,
        pdfExtraction: pdfResult,
        ocrFallback: fallbackResult
      },
      summary: {
        fileProcessed: !!file,
        ocrWorking: ocrResult?.success || false,
        textExtracted: (ocrResult?.text && ocrResult.text.length > 0) || false,
        fallbackWorking: fallbackResult?.success || false
      }
    });
    
  } catch (error) {
    console.error('Direct OCR test error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
