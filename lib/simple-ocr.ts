export async function processFileWithOCR(file: File): Promise<{text: string, source: string}> {
  console.log('🔄 Processing file with Google Vision OCR via API:', file.name);
  
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
      throw new Error(`OCR API failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Google Vision OCR successful via API');
    
    return {
      text: result.text || '',
      source: 'google_vision_ocr'
    };
  } catch (error) {
    console.error('❌ Google Vision OCR failed:', error);
    throw new Error(`Google Vision OCR failed: ${error}`);
  }
}
