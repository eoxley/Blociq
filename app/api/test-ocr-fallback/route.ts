import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Test OCR fallback processing
    try {
      console.log('🧪 Testing OCR fallback for:', file.name);
      
      const { processDocumentWithFallback } = await import('@/lib/ocr-fallback');
      const result = await processDocumentWithFallback(file);
      
      return NextResponse.json({
        success: true,
        filename: file.name,
        result: {
          textLength: result.text.length,
          source: result.source,
          method: result.method,
          quality: result.quality,
          attempts: result.attempts,
          fallbackReasons: result.fallbackReasons,
          warnings: result.warnings
        },
        preview: result.text.substring(0, 200) + (result.text.length > 200 ? '...' : ''),
        message: 'OCR fallback test completed successfully'
      });
      
    } catch (ocrError) {
      console.error('❌ OCR fallback test failed:', ocrError);
      
      return NextResponse.json({
        success: false,
        filename: file.name,
        error: 'OCR fallback test failed',
        details: ocrError instanceof Error ? ocrError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test OCR fallback API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OCR Fallback Test Endpoint',
    usage: 'POST with file to test OCR fallback processing',
    availableStrategies: ['ocr_microservice', 'google_vision', 'openai_vision']
  });
}
