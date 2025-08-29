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

    // Try API key method first, then fall back to service account
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    const visionCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    if (!apiKey && !visionCreds) {
      return NextResponse.json(
        { error: 'Google Vision API credentials not configured' },
        { status: 500 }
      );
    }

    console.log('🔍 OCR Processing:', { 
      hasFileUrl: !!fileUrl, 
      hasBase64Image: !!base64Image,
      usingApiKey: !!apiKey,
      hasServiceAccount: !!visionCreds 
    });

    let result;

    // Use API key method if available
    if (apiKey) {
      console.log('🔑 Using Google Vision API key method...');
      
      if (base64Image) {
        // Use REST API with base64 image
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              image: {
                content: base64Image
              },
              features: [{
                type: 'DOCUMENT_TEXT_DETECTION'
              }]
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`Google Vision API error: ${response.statusText}`);
        }

        const data = await response.json();
        result = data.responses[0];
      } else if (fileUrl) {
        // Use REST API with image URL
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              image: {
                source: {
                  imageUri: fileUrl
                }
              },
              features: [{
                type: 'DOCUMENT_TEXT_DETECTION'
              }]
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`Google Vision API error: ${response.statusText}`);
        }

        const data = await response.json();
        result = data.responses[0];
      }
    } else if (visionCreds) {
      // Fallback to service account method
      console.log('🔧 Using Google Vision service account method...');
      const { ImageAnnotatorClient } = await import('@google-cloud/vision');
      const client = new ImageAnnotatorClient({
        credentials: JSON.parse(visionCreds)
      });

      if (base64Image) {
        [result] = await client.documentTextDetection({
          image: { content: base64Image }
        });
      } else if (fileUrl) {
        [result] = await client.documentTextDetection(fileUrl);
      }
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
