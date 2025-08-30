export async function processFileWithOCR(file: File): Promise<{text: string, source: string}> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('OCR processing failed');
  }
  
  const result = await response.json();
  return {
    text: result.text || '',
    source: result.source || 'unknown'
  };
}
