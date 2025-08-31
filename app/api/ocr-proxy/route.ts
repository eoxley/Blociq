import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing OCR request with Google Vision directly');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    try {
      // Convert file to buffer for Google Vision OCR
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Use Google Vision OCR directly on server-side
      const { ocrFallback } = await import('../../../src/lib/compliance/docExtract');
      const ocrText = await ocrFallback(file.name, buffer);
      
      if (ocrText && ocrText.trim().length > 0) {
        console.log('✅ Google Vision OCR successful for:', file.name);
        return NextResponse.json({
          text: ocrText,
          filename: file.name,
          source: 'google_vision_ocr',
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('⚠️ Google Vision OCR returned empty text for:', file.name);
        return NextResponse.json({
          error: 'OCR processing returned no text',
          filename: file.name,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
      
    } catch (ocrError) {
      console.error('❌ Google Vision OCR failed:', ocrError);
      return NextResponse.json({
        error: 'Google Vision OCR processing failed',
        details: ocrError instanceof Error ? ocrError.message : 'Unknown error',
        filename: file.name,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('OCR proxy error:', error);
    return NextResponse.json(
      { error: 'OCR processing failed' }, 
      { status: 500 }
    );
  }
}
