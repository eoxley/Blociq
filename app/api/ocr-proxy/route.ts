import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Proxying OCR request to Render service');
    
    const formData = await request.formData();
    
    // Retry logic for OCR service
    const maxRetries = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`OCR attempt ${attempt}/${maxRetries}`);
        
        const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
          method: 'POST',
          body: formData,
          headers: {
            // Don't set Content-Type - let browser set it for FormData
          }
        });
        
        console.log(`OCR service response status: ${response.status}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('OCR success:', result.filename);
          return NextResponse.json(result);
        }
        
        // If it's a 502 (Bad Gateway), retry
        if (response.status === 502 && attempt < maxRetries) {
          const waitTime = 1000 * attempt; // Progressive backoff
          console.log(`OCR service returned 502, retrying in ${waitTime}ms...`);
          console.log(`This usually means the external OCR service is down or restarting`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // For other errors, don't retry
        const errorText = await response.text();
        console.error('OCR service error:', errorText);
        
        // Enhanced error response with diagnostics
        const errorResponse = {
          error: `OCR service error: ${response.status}`,
          statusCode: response.status,
          statusText: response.statusText,
          externalService: 'https://ocr-server-2-ykmk.onrender.com/upload',
          timestamp: new Date().toISOString(),
          attempt: attempt,
          maxRetries: maxRetries
        };
        
        if (response.status === 502) {
          errorResponse.error = 'OCR service temporarily unavailable (502 Bad Gateway)';
          errorResponse.suggestion = 'The external OCR service may be down or restarting. Please try again later.';
        }
        
        return NextResponse.json(errorResponse, { status: response.status });
        
      } catch (fetchError) {
        lastError = fetchError;
        console.error(`OCR attempt ${attempt} failed:`, fetchError);
        
        if (attempt < maxRetries) {
          const waitTime = 1000 * attempt;
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // All retries failed
    console.error('All OCR retry attempts failed');
    return NextResponse.json(
      { error: 'OCR service unavailable after multiple attempts' }, 
      { status: 503 }
    );
    
  } catch (error) {
    console.error('OCR proxy error:', error);
    return NextResponse.json(
      { error: 'OCR processing failed' }, 
      { status: 500 }
    );
  }
}
