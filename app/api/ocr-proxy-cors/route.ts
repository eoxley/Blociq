import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  console.log('🔧 CORS Proxy: Handling OCR request to external server');

  try {
    // Get the form data from the request
    const formData = await req.formData();
    
    console.log('📄 CORS Proxy: Form data received');

    // Forward the request to the OCR server
    const ocrResponse = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - let fetch handle multipart boundaries
      },
    });

    console.log('📡 CORS Proxy: OCR server response status:', ocrResponse.status);

    if (!ocrResponse.ok) {
      console.error('❌ CORS Proxy: OCR server error:', ocrResponse.status);
      return NextResponse.json(
        { 
          success: false, 
          error: `OCR server error: ${ocrResponse.status}`,
          details: await ocrResponse.text()
        },
        { status: ocrResponse.status }
      );
    }

    const result = await ocrResponse.json();
    console.log('✅ CORS Proxy: OCR processing successful');

    // Return the result with proper CORS headers
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('❌ CORS Proxy: Error processing OCR request:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process OCR request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}