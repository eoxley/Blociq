import { NextRequest, NextResponse } from 'next/server';
import { getVisionClient } from '../../../ocrClient';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, base64Image } = await request.json();

    if (!fileUrl && !base64Image) {
      return NextResponse.json(
        { error: 'Missing fileUrl or base64Image' },
        { status: 400 }
      );
    }

    console.log('🔍 OCR Processing:', { 
      hasFileUrl: !!fileUrl, 
      hasBase64Image: !!base64Image
    });

    let result;

    const client = getVisionClient();

    if (base64Image) {
      [result] = await client.documentTextDetection({
        image: { content: base64Image }
      });
    } else if (fileUrl) {
      [result] = await client.documentTextDetection(fileUrl);
    }

    // Extract text from the result (both API methods return similar structure)
    const text = result?.fullTextAnnotation?.text || result?.textAnnotations?.[0]?.description || '';
    
    if (!text || text.trim().length === 0) {
      console.log('⚠️ No text detected in document');
      return NextResponse.json(
        { error: 'OCR found no readable text' },
        { status: 422 }
      );
    }

    console.log('✅ OCR successful, extracted text length:', text.length);
    
    return NextResponse.json({
      success: true,
      text: text.trim(),
      confidence: result?.fullTextAnnotation?.pages?.[0]?.confidence || 0,
      language: result?.fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode || 'en'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ OCR API error:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'OCR processing failed',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
