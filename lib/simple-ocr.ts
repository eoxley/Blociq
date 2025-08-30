export async function processFileWithOCR(file: File): Promise<{text: string, source: string}> {
  console.log('🔄 Starting OCR processing for file:', file.name, 'Size:', file.size, 'Type:', file.type);
  
  const formData = new FormData();
  formData.append('file', file);
  
  console.log('📤 Calling OCR service at: https://ocr-server-2-ykmk.onrender.com/upload');
  
  try {
    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: formData
    });
    
    console.log('📥 OCR response status:', response.status, response.statusText);
    console.log('📥 OCR response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OCR failed with status:', response.status, 'Error:', errorText);
      throw new Error(`OCR failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ OCR result:', result);
    
    return {
      text: result.text || '',
      source: result.source || 'external-ocr'
    };
  } catch (error) {
    console.error('❌ OCR processing error:', error);
    throw error;
  }
}
