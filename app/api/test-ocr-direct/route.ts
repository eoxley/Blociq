import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing direct OCR service connection...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log(`📁 Testing file: ${file.name} (${file.size} bytes)`);
    
    // Test direct connection to OCR service
    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: formData
    });
    
    console.log(`📡 OCR service response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OCR service error:', errorText);
      
      return NextResponse.json({
        error: 'OCR service unavailable',
        status: response.status,
        statusText: response.statusText,
        details: errorText,
        suggestion: 'The external OCR service may be down or restarting'
      }, { status: response.status });
    }
    
    const result = await response.json();
    console.log('✅ OCR service working!');
    
    return NextResponse.json({
      success: true,
      text: result.text || '',
      filename: file.name,
      ocrSource: result.source || 'unknown',
      textLength: result.text?.length || 0
    });
    
  } catch (error) {
    console.error('💥 Test OCR error:', error);
    return NextResponse.json({
      error: 'OCR test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
