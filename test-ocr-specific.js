#!/usr/bin/env node

/**
 * Specific OCR test for Render service
 */

async function testOCRService() {
  console.log('🔍 Testing Render OCR Service...\n');

  const ocrBaseUrl = process.env.OCR_BASE_URL || 'https://ocr-server-2-ykmk.onrender.com';
  
  if (!ocrBaseUrl) {
    console.log('❌ OCR test failed - OCR_BASE_URL not set');
    return;
  }

  try {
    // Create a simple test PDF using a basic approach
    const testPdf = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Hello BlocIQ Vision OCR 12345) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`);

    console.log('📄 Created test PDF (', testPdf.length, 'bytes)');

    const formData = new FormData();
    const blob = new Blob([testPdf], { type: 'application/pdf' });
    formData.append('file', blob, 'smoke-test.pdf');

    console.log('🚀 Sending request to:', `${ocrBaseUrl}/upload`);
    console.log('📋 Request details:');
    console.log('  - Method: POST');
    console.log('  - Content-Type: multipart/form-data');
    console.log('  - File: smoke-test.pdf');

    const response = await fetch(`${ocrBaseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OCR_AUTH_TOKEN || '1'}`
      },
      body: formData,
    });

    console.log('\n📊 Response received:');
    console.log('  - Status:', response.status);
    console.log('  - Status Text:', response.statusText);
    console.log('  - Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ OCR test passed!');
      console.log('📋 Response data:');
      console.log(JSON.stringify(data, null, 2));
      
      // Check for expected fields
      if (data.success !== undefined) {
        console.log('✅ success field present:', data.success);
      }
      if (data.engine) {
        console.log('✅ engine field present:', data.engine);
      }
      if (data.textLength !== undefined) {
        console.log('✅ textLength field present:', data.textLength);
      }
      if (data.text) {
        console.log('✅ text field present (length:', data.text.length, ')');
        console.log('📝 Sample text:', data.text.substring(0, 100) + '...');
      }
      if (data.error) {
        console.log('⚠️  Error field present:', data.error);
      }
    } else {
      const errorText = await response.text();
      console.log('\n❌ OCR test failed!');
      console.log('📋 Error response:');
      console.log(errorText);
    }
  } catch (error) {
    console.log('\n❌ OCR test failed with error:');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    if (error.cause) {
      console.log('Error cause:', error.cause);
    }
  }
}

// Run the test
testOCRService().catch(console.error);
