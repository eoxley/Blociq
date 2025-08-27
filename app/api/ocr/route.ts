import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, base64Image } = await request.json();

    if (!fileUrl && !base64Image) {
      return NextResponse.json(
        { error: 'Missing fileUrl or base64Image' },
        { status: 400 }
      );
    }

    // Check if Google Vision credentials are available
    const visionCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!visionCreds) {
      return NextResponse.json(
        { error: 'Google Vision credentials not configured' },
        { status: 500 }
      );
    }

    // Initialize Google Vision client
    const { ImageAnnotatorClient } = await import('@google-cloud/vision');
    const client = new ImageAnnotatorClient({
      credentials: JSON.parse(visionCreds)
    });

    console.log('🔍 OCR Processing:', { 
      hasFileUrl: !!fileUrl, 
      hasBase64Image: !!base64Image,
      credentialsConfigured: !!visionCreds 
    });

    let result;
    
    if (base64Image) {
      // Process base64 encoded image
      console.log('📸 Processing base64 image...');
      [result] = await client.documentTextDetection({
        image: { content: base64Image }
      });
    } else if (fileUrl) {
      // Process file URL
      console.log('📁 Processing file URL:', fileUrl);
      [result] = await client.documentTextDetection(fileUrl);
    }

    const text = result?.fullTextAnnotation?.text || '';
    
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
