import { NextRequest, NextResponse } from 'next/server';
import { processDocumentWithFallback } from '@/lib/ocr-fallback';
import { processDocumentOCR } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log('🔍 Testing OCR Fallback System with file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Test 1: Direct OCR function
    console.log('🧪 Test 1: Direct OCR function...');
    let directOCRResult = null;
    try {
      const result = await processDocumentOCR(file);
      directOCRResult = {
        success: true,
        textLength: result.text?.length || 0,
        textPreview: result.text?.substring(0, 100) || 'No text',
        confidence: result.confidence,
        source: result.source
      };
    } catch (error) {
      directOCRResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test 2: OCR Fallback System
    console.log('🧪 Test 2: OCR Fallback System...');
    let fallbackResult = null;
    try {
      const result = await processDocumentWithFallback(file);
      fallbackResult = {
        success: true,
        textLength: result.text?.length || 0,
        textPreview: result.text?.substring(0, 100) || 'No text',
        method: result.method,
        attempts: result.attempts,
        fallbackReasons: result.fallbackReasons,
        quality: result.quality
      };
    } catch (error) {
      fallbackResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test 3: Check available strategies
    console.log('🧪 Test 3: Available OCR Strategies...');
    const { ocrFallbackProcessor } = await import('@/lib/ocr-fallback');
    const availableStrategies = ocrFallbackProcessor.getAvailableStrategies();
    
    return NextResponse.json({
      success: true,
      tests: {
        directOCR: directOCRResult,
        fallbackSystem: fallbackResult,
        availableStrategies,
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      }
    });
    
  } catch (error) {
    console.error('Test OCR fallback system error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
