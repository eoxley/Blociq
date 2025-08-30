import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Checking OCR service health...');
    
    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: new FormData() // Empty for health check
    });
    
    const status = response.ok ? 'healthy' : 'unhealthy';
    console.log(`OCR service status: ${status} (${response.status})`);
    
    return NextResponse.json({
      status,
      statusCode: response.status,
      timestamp: new Date().toISOString(),
      serviceUrl: 'https://ocr-server-2-ykmk.onrender.com/upload'
    });
    
  } catch (error) {
    console.error('OCR health check error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      serviceUrl: 'https://ocr-server-2-ykmk.onrender.com/upload'
    }, { status: 500 });
  }
}
