import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log('🧪 Testing OCR system configuration...');
    
    // Test 1: Check environment variables
    const tests = {
      openai_api_key: !!process.env.OPENAI_API_KEY,
      google_credentials_json: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      google_credentials_file: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      google_project_id: !!process.env.GOOGLE_PROJECT_ID,
      ocr_service_url: !!process.env.OCR_SERVICE_URL,
    };
    
    // Test 2: Test OpenAI API key validity
    let openai_api_test = false;
    if (process.env.OPENAI_API_KEY) {
      try {
        const testResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        });
        openai_api_test = testResponse.ok;
      } catch (error) {
        console.error('OpenAI API test failed:', error);
      }
    }
    
    // Test 3: Test external OCR service
    let external_ocr_test = false;
    if (process.env.OCR_SERVICE_URL) {
      try {
        const testResponse = await fetch(process.env.OCR_SERVICE_URL.replace('/upload', '/health') || process.env.OCR_SERVICE_URL, {
          method: 'GET',
          headers: {
            'User-Agent': 'BlocIQ-OCR-Test/1.0'
          }
        });
        external_ocr_test = testResponse.ok;
      } catch (error) {
        console.error('External OCR service test failed:', error);
      }
    }
    
    const results = {
      timestamp: new Date().toISOString(),
      environment_variables: tests,
      api_tests: {
        openai_api_accessible: openai_api_test,
        external_ocr_accessible: external_ocr_test,
      },
      available_routes: [
        '/api/ocr-proxy-cors (External OCR + OpenAI Vision fallback)',
        '/api/ocr-openai (Direct OpenAI Vision)',
        '/api/test-ocr (This test endpoint)'
      ],
      recommendations: []
    };
    
    // Add recommendations
    if (!tests.openai_api_key) {
      results.recommendations.push('Set OPENAI_API_KEY environment variable');
    }
    
    if (!openai_api_test && tests.openai_api_key) {
      results.recommendations.push('Check OPENAI_API_KEY validity');
    }
    
    if (!external_ocr_test && tests.ocr_service_url) {
      results.recommendations.push('External OCR service may be unavailable');
    }
    
    if (tests.openai_api_key && openai_api_test) {
      results.recommendations.push('✅ OpenAI Vision OCR is ready to use');
    }
    
    if (results.recommendations.length === 0) {
      results.recommendations.push('❌ No OCR services are properly configured');
    }
    
    console.log('✅ OCR system test completed');
    
    return NextResponse.json({
      success: true,
      system_status: 'OCR Enhanced System Active',
      ...results
    });
    
  } catch (error) {
    console.error('❌ OCR system test failed:', error);
    return NextResponse.json({ 
      success: false,
      error: 'OCR system test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: 'Use GET method to test OCR system configuration',
    available_methods: ['GET'],
    ocr_endpoints: [
      'POST /api/ocr-proxy-cors',
      'POST /api/ocr-openai'
    ]
  }, { status: 405 });
}