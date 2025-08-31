import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing OCR pipeline endpoints...');

    const results = {
      endpoints: [],
      summary: {
        total: 0,
        working: 0,
        failed: 0
      }
    };

    // Test 1: Ask AI Upload endpoint
    try {
      const testFormData = new FormData();
      // Create a minimal test file
      const testBlob = new Blob(['This is a test document for OCR processing.'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
      testFormData.append('file', testFile);

      const uploadResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/ask-ai/upload`, {
        method: 'POST',
        body: testFormData,
        headers: {
          'User-Agent': 'OCR-Pipeline-Test/1.0'
        }
      });

      const uploadData = await uploadResponse.json();
      
      results.endpoints.push({
        name: 'Ask AI Upload',
        path: '/api/ask-ai/upload',
        status: uploadResponse.ok ? 'working' : 'failed',
        statusCode: uploadResponse.status,
        response: uploadData,
        hasExtractedText: !!(uploadData.extractedText && uploadData.extractedText.length > 0),
        textLength: uploadData.textLength || 0
      });

      if (uploadResponse.ok) results.summary.working++;
      else results.summary.failed++;
    } catch (error) {
      results.endpoints.push({
        name: 'Ask AI Upload',
        path: '/api/ask-ai/upload',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      results.summary.failed++;
    }

    results.summary.total = results.endpoints.length;

    // Test 2: Check OCR proxy endpoint  
    try {
      const testFormData = new FormData();
      const testBlob = new Blob(['This is a test document for OCR processing.'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
      testFormData.append('file', testFile);

      const proxyResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/ocr-proxy-cors`, {
        method: 'POST',
        body: testFormData,
        headers: {
          'User-Agent': 'OCR-Pipeline-Test/1.0'
        }
      });

      const proxyData = await proxyResponse.json();
      
      results.endpoints.push({
        name: 'OCR Proxy CORS',
        path: '/api/ocr-proxy-cors', 
        status: proxyResponse.ok ? 'working' : 'failed',
        statusCode: proxyResponse.status,
        response: proxyData,
        hasText: !!(proxyData.text && proxyData.text.length > 0),
        textLength: proxyData.text?.length || 0
      });

      if (proxyResponse.ok) results.summary.working++;
      else results.summary.failed++;
    } catch (error) {
      results.endpoints.push({
        name: 'OCR Proxy CORS',
        path: '/api/ocr-proxy-cors',
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      results.summary.failed++;
    }

    results.summary.total = results.endpoints.length;

    // Test 3: Environment check
    const envCheck = {
      openAI_configured: !!process.env.OPENAI_API_KEY,
      openAI_keyLength: process.env.OPENAI_API_KEY?.length || 0,
      google_credentials_file: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      google_credentials_json: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      google_individual_vars: !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
    };

    return NextResponse.json({
      success: true,
      message: 'OCR pipeline test completed',
      timestamp: new Date().toISOString(),
      results,
      environment: envCheck,
      recommendations: [
        results.summary.working === 0 ? '❌ No OCR endpoints are working - check API configurations' : '',
        !envCheck.openAI_configured ? '⚠️ OpenAI API key not configured - vision fallback unavailable' : '',
        results.endpoints.find(e => e.name === 'Ask AI Upload' && e.status === 'working') ? '✅ Primary Ask AI upload endpoint is working' : '',
        results.endpoints.find(e => e.hasExtractedText) ? '✅ Text extraction is working' : '❌ No text extraction detected'
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('❌ OCR pipeline test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'OCR pipeline test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}