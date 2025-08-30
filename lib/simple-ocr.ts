export async function processFileWithOCR(file: File): Promise<{text: string, source: string}> {
  console.log('Calling OCR service via proxy: /api/ocr-proxy');
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/ocr-proxy', {
    method: 'POST',
    body: formData
  });
  
  console.log('📡 OCR response status:', response.status);
  
  if (!response.ok) {
    throw new Error(`OCR failed: ${response.status}`);
  }
  
  const result = await response.json();
  return {
    text: result.text || '',
    source: result.source || 'unknown'
  };
}
