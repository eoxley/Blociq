// Enhanced file info logging
function logFileInfo(file: File) {
  console.log('📁 File info:', {
    name: file.name,
    size: file.size,
    type: file.type,
    sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
  });
}

export async function processFileWithOCR(file: File): Promise<{text: string, source: string}> {
  console.log('🔄 Processing file with OCR via API:', file.name);
  logFileInfo(file);
  
  // Check file size (100MB limit based on API constraints)
  if (file.size > 100 * 1024 * 1024) {
    console.log('❌ File too large for OCR processing');
    throw new Error('File too large for OCR processing');
  }
  
  try {
    // Convert file to FormData for OCR API
    const formData = new FormData();
    formData.append('file', file);
    
    // Call OCR server via CORS proxy to avoid CORS issues
    const response = await fetch('/api/ocr-proxy-cors', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OCR API failed (${response.status}):`, errorText);
      throw new Error(`OCR API failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ OCR processing successful via API');
    
    return {
      text: result.text || '',
      source: result.source || 'unknown_ocr'
    };
  } catch (error) {
    console.error('❌ OCR processing failed:', error);
    throw new Error(`OCR processing failed: ${error}`);
  }
}

// Test mode function for pipeline testing
export async function processFileWithOCRTEST(file: File): Promise<{text: string, source: string}> {
  console.log('🧪 TEST MODE: Bypassing OCR, returning fake text');
  logFileInfo(file);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const fakeText = `TEST EXTRACTION for ${file.name}
  
This is fake text to test the pipeline.
File size: ${file.size} bytes
File type: ${file.type}
Current time: ${new Date().toISOString()}

Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco.

DOCUMENT CONTENT:
- Date: ${new Date().toLocaleDateString()}
- Time: ${new Date().toLocaleTimeString()}
- Reference: TEST-${Math.random().toString(36).substring(7).toUpperCase()}
- Amount: $1,234.56
- Status: PROCESSED

This text should show up in your frontend with a character count.`;

  console.log(`🧪 TEST MODE: Generated fake text with ${fakeText.length} characters`);

  return {
    text: fakeText,
    source: 'test_mode'
  };
}
