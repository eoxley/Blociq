import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Test endpoint to verify PDF extraction capabilities
export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing PDF extraction capabilities...');

    // Test environment setup
    const envCheck = {
      openAI: {
        configured: !!process.env.OPENAI_API_KEY,
        keyLength: process.env.OPENAI_API_KEY?.length || 0
      },
      googleVision: {
        apiKey: !!process.env.GOOGLE_VISION_API_KEY,
        credentialsFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        credentialsJson: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
        serviceAccount: !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
      },
      runtime: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage()
      }
    };

    // Test dependency availability
    const dependencies = {};
    
    try {
      await import('tesseract.js');
      dependencies.tesseract = '✅ Available';
    } catch {
      dependencies.tesseract = '❌ Not installed';
    }

    try {
      await import('pdfjs-dist');
      dependencies.pdfjs = '✅ Available';
    } catch {
      dependencies.pdfjs = '❌ Not installed';
    }

    try {
      await import('google-auth-library');
      dependencies.googleAuth = '✅ Available';
    } catch {
      dependencies.googleAuth = '❌ Not installed';
    }

    // Configuration recommendations
    const recommendations = [];
    
    if (!envCheck.openAI.configured) {
      recommendations.push('🔧 Set OPENAI_API_KEY environment variable for reliable PDF OCR');
    }
    
    if (!envCheck.googleVision.apiKey && !envCheck.googleVision.credentialsFile && !envCheck.googleVision.credentialsJson && !envCheck.googleVision.serviceAccount) {
      recommendations.push('🔧 Configure Google Vision API credentials (GOOGLE_VISION_API_KEY or service account)');
    }
    
    if (dependencies.tesseract !== '✅ Available') {
      recommendations.push('📦 Run: npm install tesseract.js');
    }
    
    if (dependencies.pdfjs !== '✅ Available') {
      recommendations.push('📦 Run: npm install pdfjs-dist');
    }
    
    if (dependencies.googleAuth !== '✅ Available') {
      recommendations.push('📦 Run: npm install google-auth-library');
    }

    // Endpoint availability test
    let uploadEndpointTest = 'Not tested';
    try {
      const testResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/ask-ai/upload`, {
        method: 'POST',
        body: new FormData() // Empty form data to test endpoint existence
      });
      uploadEndpointTest = `${testResponse.status} ${testResponse.statusText}`;
    } catch (error) {
      uploadEndpointTest = `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: 'PDF extraction test complete',
      environment: envCheck,
      dependencies,
      endpoints: {
        askAIUpload: uploadEndpointTest
      },
      recommendations,
      readyForProduction: recommendations.length === 0,
      extractionMethods: [
        {
          name: 'PDF.js',
          description: 'Extract text from text-based PDFs',
          requirements: ['pdfjs-dist package'],
          status: dependencies.pdfjs === '✅ Available' ? 'Ready' : 'Needs setup'
        },
        {
          name: 'OpenAI Vision',
          description: 'OCR for scanned PDFs and images using GPT-4V',
          requirements: ['OPENAI_API_KEY environment variable'],
          status: envCheck.openAI.configured ? 'Ready' : 'Needs setup'
        },
        {
          name: 'Google Vision',
          description: 'Google Cloud Vision API OCR',
          requirements: ['Google Cloud credentials'],
          status: (envCheck.googleVision.apiKey || envCheck.googleVision.credentialsFile || envCheck.googleVision.credentialsJson || envCheck.googleVision.serviceAccount) ? 'Ready' : 'Needs setup'
        },
        {
          name: 'Tesseract.js',
          description: 'Local OCR processing (fallback)',
          requirements: ['tesseract.js package'],
          status: dependencies.tesseract === '✅ Available' ? 'Ready' : 'Needs setup'
        }
      ]
    });

  } catch (error) {
    console.error('❌ PDF extraction test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'PDF extraction test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to test with actual file
export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing PDF extraction with uploaded file...');

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No test file provided'
      }, { status: 400 });
    }

    // Forward to the main upload endpoint for testing
    const uploadResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/ask-ai/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await uploadResponse.json();

    return NextResponse.json({
      success: true,
      message: 'PDF extraction test with file completed',
      uploadEndpointStatus: uploadResponse.status,
      uploadEndpointResponse: result,
      extractionSuccessful: result.success && result.textLength > 0,
      textExtracted: result.textLength || 0,
      ocrMethod: result.ocrSource || 'unknown'
    });

  } catch (error) {
    console.error('❌ PDF extraction file test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'PDF extraction file test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}