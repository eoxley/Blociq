import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Google Vision API connectivity...');
    
    // Check environment variables
    const envCheck = {
      hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasProject: !!process.env.GOOGLE_PROJECT_ID,
      hasJsonCreds: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      hasCredsFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
    };
    
    console.log('🔍 Environment check:', envCheck);
    
    if (!envCheck.hasEmail && !envCheck.hasJsonCreds && !envCheck.hasCredsFile) {
      return NextResponse.json({
        error: 'Google Vision not configured',
        details: 'Missing required environment variables',
        envCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    try {
      // Test Google Vision client initialization
      console.log('🔧 Testing Google Vision client initialization...');
      const { getVisionClient, testGoogleVisionCredentials } = await import('../../../ocrClient');
      
      const client = getVisionClient();
      if (!client) {
        throw new Error('Failed to get Google Vision client');
      }
      
      console.log('✅ Google Vision client initialized successfully');
      
      // Test with a minimal API call (1x1 pixel image)
      console.log('🚀 Testing Google Vision API call...');
      const testResult = await testGoogleVisionCredentials();
      
      if (testResult) {
        console.log('✅ Google Vision API test successful');
        return NextResponse.json({
          success: true,
          message: 'Google Vision API is working correctly',
          envCheck,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Google Vision API test failed');
      }
      
    } catch (visionError) {
      console.error('❌ Google Vision test failed:', visionError);
      
      let errorDetails = 'Unknown error';
      let errorCode = 500;
      
      if (visionError instanceof Error) {
        errorDetails = visionError.message;
        
        // Check for specific error types
        if (visionError.message.includes('credentials')) {
          errorCode = 401;
        } else if (visionError.message.includes('permission')) {
          errorCode = 403;
        } else if (visionError.message.includes('quota')) {
          errorCode = 429;
        }
      }
      
      return NextResponse.json({
        error: 'Google Vision API test failed',
        details: errorDetails,
        envCheck,
        timestamp: new Date().toISOString()
      }, { status: errorCode });
    }
    
  } catch (error) {
    console.error('❌ OCR test endpoint error:', error);
    
    return NextResponse.json({
      error: 'OCR test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Google Vision OCR with test image...');
    
    // Create a minimal test image (1x1 pixel)
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    
    try {
      const { ocrFallback } = await import('../../../src/lib/compliance/docExtract');
      const ocrText = await ocrFallback('test.png', testImageBuffer);
      
      console.log('📝 Test OCR result:', {
        hasText: !!ocrText,
        textLength: ocrText?.length || 0,
        text: ocrText || 'No text'
      });
      
      return NextResponse.json({
        success: true,
        message: 'Test OCR completed successfully',
        result: {
          hasText: !!ocrText,
          textLength: ocrText?.length || 0,
          text: ocrText || 'No text'
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (ocrError) {
      console.error('❌ Test OCR failed:', ocrError);
      
      return NextResponse.json({
        error: 'Test OCR failed',
        details: ocrError instanceof Error ? ocrError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ OCR test POST error:', error);
    
    return NextResponse.json({
      error: 'OCR test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
