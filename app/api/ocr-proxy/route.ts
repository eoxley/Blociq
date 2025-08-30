import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Proxying OCR request to Render service');
    
    const formData = await request.formData();
    
    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - let browser set it for FormData
      }
    });
    
    console.log('OCR service response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OCR service error:', errorText);
      return NextResponse.json(
        { error: `OCR service error: ${response.status}` }, 
        { status: response.status }
      );
    }
    
    const result = await response.json();
    console.log('OCR success:', result.filename);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('OCR proxy error:', error);
    return NextResponse.json(
      { error: 'OCR processing failed' }, 
      { status: 500 }
    );
  }
}
