import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 OCR Debug: Testing Google Vision API directly...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log('📁 File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('📊 Buffer created:', {
      bufferLength: buffer.length,
      isBuffer: Buffer.isBuffer(buffer)
    });
    
    try {
      // Test Google Vision client directly
      const { getVisionClient } = await import('../../../ocrClient');
      const client = getVisionClient();
      
      if (!client) {
        throw new Error('Failed to get Google Vision client');
      }
      
      console.log('✅ Google Vision client obtained');
      
      // Test with different approaches
      const results: any = {};
      
      // Test 1: Direct text detection
      try {
        console.log('🧪 Test 1: Direct text detection...');
        const [textResult] = await client.textDetection({
          image: { content: buffer.toString('base64') }
        });
        
        results.textDetection = {
          success: true,
          hasTextAnnotations: !!textResult.textAnnotations,
          annotationCount: textResult.textAnnotations?.length || 0,
          text: textResult.textAnnotations?.[0]?.description || 'No text'
        };
        
        console.log('✅ Text detection result:', results.textDetection);
      } catch (error) {
        console.error('❌ Text detection failed:', error);
        results.textDetection = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
      
      // Test 2: Document text detection
      try {
        console.log('🧪 Test 2: Document text detection...');
        const [docResult] = await client.documentTextDetection({
          image: { content: buffer.toString('base64') }
        });
        
        results.documentTextDetection = {
          success: true,
          hasFullText: !!docResult.fullTextAnnotation,
          textLength: docResult.fullTextAnnotation?.text?.length || 0,
          pages: docResult.fullTextAnnotation?.pages?.length || 0,
          text: docResult.fullTextAnnotation?.text || 'No text'
        };
        
        console.log('✅ Document text detection result:', results.documentTextDetection);
      } catch (error) {
        console.error('❌ Document text detection failed:', error);
        results.documentTextDetection = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
      
      // Test 3: Check if it's a valid image
      try {
        console.log('🧪 Test 3: Image properties...');
        const [imageResult] = await client.imageProperties({
          image: { content: buffer.toString('base64') }
        });
        
        results.imageProperties = {
          success: true,
          dominantColors: imageResult.imagePropertiesAnnotation?.dominantColors?.colors?.length || 0
        };
        
        console.log('✅ Image properties result:', results.imageProperties);
      } catch (error) {
        console.error('❌ Image properties failed:', error);
        results.imageProperties = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
      
      return NextResponse.json({
        success: true,
        message: 'OCR debug tests completed',
        results,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ OCR debug failed:', error);
      
      return NextResponse.json({
        error: 'OCR debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ OCR debug endpoint error:', error);
    
    return NextResponse.json({
      error: 'OCR debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}