#!/usr/bin/env node

/**
 * Test script to debug small PDF processing issue
 */

const fs = require('fs');
const path = require('path');

async function testSmallPDF() {
  console.log('🧪 Testing small PDF processing...\n');
  
  try {
    // Create a test PDF buffer (1KB - similar to the reported size)
    const testPdfContent = `%PDF-1.4
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
(Test PDF Content) Tj
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
%%EOF`;

    const testPdfPath = path.join(__dirname, 'test-small.pdf');
    fs.writeFileSync(testPdfPath, testPdfContent);
    
    const stats = fs.statSync(testPdfPath);
    console.log('📄 Test PDF created:');
    console.log('  Size:', stats.size, 'bytes');
    console.log('  Size in KB:', (stats.size / 1024).toFixed(2), 'KB');
    console.log('  Size in MB:', (stats.size / (1024 * 1024)).toFixed(4), 'MB');
    
    // Test the file upload to Ask AI
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(testPdfPath), {
      filename: 'test-small.pdf',
      contentType: 'application/pdf'
    });
    
    console.log('\n🚀 Testing upload to Ask AI...');
    const response = await fetch('http://localhost:3002/api/ask-ai/upload', {
      method: 'POST',
      body: form
    });
    
    console.log('Response Status:', response.status);
    const result = await response.json();
    console.log('\n📊 Upload Result:');
    console.log('Success:', result.success);
    console.log('Error:', result.error);
    console.log('Text Length:', result.textLength);
    console.log('Source:', result.source);
    console.log('Filename:', result.filename);
    
    if (result.extractedText) {
      console.log('\n📝 Extracted Text (first 200 chars):');
      console.log(result.extractedText.substring(0, 200));
    }
    
    // Clean up
    fs.unlinkSync(testPdfPath);
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSmallPDF().catch(console.error);
