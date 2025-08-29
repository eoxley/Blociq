/**
 * Process a file through OCR and return the extracted text
 * This function handles the OCR processing pipeline for uploaded documents
 */

export interface OCRResult {
  success: boolean;
  text: string;
  confidence?: number;
  error?: string;
  processingTime?: number;
}

export async function processFileWithOCR(file: File): Promise<OCRResult> {
  const startTime = Date.now();
  
  try {
    // Validate file
    if (!file) {
      return {
        success: false,
        text: '',
        error: 'No file provided'
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        text: '',
        error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of 10MB`
      };
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        text: '',
        error: `File type ${file.type} is not supported. Please upload PDF, DOC, DOCX, TXT, JPG, or PNG files.`
      };
    }

    console.log(`🔄 Processing file: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Create form data for OCR service
    const formData = new FormData();
    formData.append('file', file);

    // Call OCR microservice
    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`OCR service error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.text || result.text.trim().length === 0) {
      return {
        success: false,
        text: '',
        error: 'OCR service returned no text content. The document may be unreadable or corrupted.'
      };
    }

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ OCR processing completed for ${file.name}:`, {
      textLength: result.text.length,
      confidence: result.confidence || 'unknown',
      processingTime: `${processingTime}ms`
    });

    return {
      success: true,
      text: result.text.trim(),
      confidence: result.confidence || 0.8,
      processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown OCR processing error';
    
    console.error(`❌ OCR processing failed for ${file.name}:`, error);
    
    return {
      success: false,
      text: '',
      error: errorMessage,
      processingTime
    };
  }
}

/**
 * Batch process multiple files through OCR
 */
export async function processFilesWithOCR(files: File[]): Promise<OCRResult[]> {
  console.log(`🔄 Starting batch OCR processing for ${files.length} files`);
  
  const results = await Promise.all(
    files.map(file => processFileWithOCR(file))
  );
  
  const successful = results.filter(result => result.success).length;
  const failed = results.filter(result => !result.success).length;
  
  console.log(`✅ Batch OCR processing completed: ${successful} successful, ${failed} failed`);
  
  return results;
}

/**
 * Validate if a file can be processed through OCR
 */
export function canProcessWithOCR(file: File): boolean {
  // Check file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) return false;
  
  // Check file type
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  return allowedTypes.includes(file.type);
}

/**
 * Get file type description for display
 */
export function getFileTypeDescription(file: File): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF Document',
    'image/jpeg': 'JPEG Image',
    'image/jpg': 'JPEG Image',
    'image/png': 'PNG Image',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'text/plain': 'Text File'
  };
  
  return typeMap[file.type] || 'Unknown File Type';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
