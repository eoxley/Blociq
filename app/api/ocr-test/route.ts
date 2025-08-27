import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if Google Vision credentials are available
    const visionCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!visionCreds) {
      return NextResponse.json(
        { 
          error: 'Google Vision credentials not configured',
          missing: 'GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable'
        },
        { status: 500 }
      );
    }

    // Test credentials parsing
    let credentials;
    try {
      credentials = JSON.parse(visionCreds);
      console.log('✅ Credentials parsed successfully');
    } catch (parseError) {
      return NextResponse.json(
        { 
          error: 'Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON',
          details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        },
        { status: 500 }
      );
    }

    // Test Google Vision client initialization
    try {
      const { ImageAnnotatorClient } = await import('@google-cloud/vision');
      const client = new ImageAnnotatorClient({ credentials });
      console.log('✅ Google Vision client initialized successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Google Vision connectivity test passed',
        credentials: {
          type: credentials.type || 'Unknown',
          project_id: credentials.project_id || 'Unknown',
          client_email: credentials.client_email ? `${credentials.client_email.substring(0, 10)}...` : 'Unknown'
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (clientError) {
      const errorMessage = clientError instanceof Error ? clientError.message : 'Unknown client error';
      console.error('❌ Google Vision client initialization failed:', errorMessage);
      
      return NextResponse.json(
        { 
          error: 'Google Vision client initialization failed',
          details: errorMessage
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ OCR test error:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'OCR test failed',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testImage } = await request.json();
    
    if (!testImage) {
      return NextResponse.json(
        { error: 'Missing testImage in request body' },
        { status: 400 }
      );
    }

    // Check credentials
    const visionCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!visionCreds) {
      return NextResponse.json(
        { error: 'Google Vision credentials not configured' },
        { status: 500 }
      );
    }

    // Test actual OCR processing
    const { ImageAnnotatorClient } = await import('@google-cloud/vision');
    const client = new ImageAnnotatorClient({
      credentials: JSON.parse(visionCreds)
    });

    console.log('🧪 Testing OCR with provided image...');
    
    const [result] = await client.documentTextDetection({
      image: { content: testImage }
    });

    const text = result?.fullTextAnnotation?.text || '';
    const confidence = result?.fullTextAnnotation?.pages?.[0]?.confidence || 0;
    
    console.log('✅ OCR test successful:', { 
      textLength: text.length, 
      confidence: confidence.toFixed(2) 
    });

    return NextResponse.json({
      success: true,
      message: 'OCR test completed successfully',
      result: {
        text: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
        fullTextLength: text.length,
        confidence: confidence,
        pages: result?.fullTextAnnotation?.pages?.length || 0
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ OCR test processing error:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'OCR test processing failed',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
