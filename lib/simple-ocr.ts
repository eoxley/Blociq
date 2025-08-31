export async function processFileWithOCR(file: File): Promise<{text: string, source: string}> {
  console.log('🔄 Processing file with Google Vision OCR:', file.name);
  
  try {
    // Convert file to buffer for Google Vision OCR
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Use Google Vision OCR directly
    const { ocrFallback } = await import('@/lib/compliance/docExtract');
    const ocrText = await ocrFallback(file.name, buffer);
    
    console.log('✅ Google Vision OCR successful');
    
    return {
      text: ocrText || '',
      source: 'google_vision_ocr'
    };
  } catch (error) {
    console.error('❌ Google Vision OCR failed:', error);
    throw new Error(`Google Vision OCR failed: ${error}`);
  }
}
