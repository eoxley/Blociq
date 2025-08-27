/**
 * OCR Document Processing Utility for BlocIQ
 * Integrates with external OCR service for document text extraction
 */

export interface OCRResult {
  text: string;
  source: string;
  filename: string;
  confidence?: number;
  processingTime?: number;
  error?: string;
}

export interface OCRProcessingOptions {
  language?: string;
  enhanceText?: boolean;
  extractTables?: boolean;
  extractImages?: boolean;
}

/**
 * Process a document through OCR service
 * @param file - The file to process
 * @param options - Optional processing parameters
 * @returns Promise<OCRResult> - Structured OCR result
 */
export async function processDocumentOCR(
  file: File, 
  options: OCRProcessingOptions = {}
): Promise<OCRResult> {
  const startTime = Date.now();
  
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 10MB.');
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    // Convert file to base64
    const base64Data = await fileToBase64(file);
    
    // Prepare request payload
    const payload = {
      file: base64Data,
      filename: file.name,
      mimeType: file.type,
      options: {
        language: options.language || 'en',
        enhanceText: options.enhanceText !== false,
        extractTables: options.extractTables || false,
        extractImages: options.extractImages || false
      }
    };

    // Send to OCR service
    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OCR service error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'OCR processing failed');
    }

    const processingTime = Date.now() - startTime;

    return {
      text: result.text || '',
      source: 'external_ocr_service',
      filename: file.name,
      confidence: result.confidence || undefined,
      processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return {
      text: '',
      source: 'error',
      filename: file.name,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processingTime
    };
  }
}

/**
 * Convert file to base64 string
 * @param file - File to convert
 * @returns Promise<string> - Base64 encoded string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      try {
        const base64 = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64Data = base64.split(',')[1];
        if (!base64Data) {
          reject(new Error('Failed to convert file to base64'));
          return;
        }
        resolve(base64Data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

/**
 * Batch process multiple documents
 * @param files - Array of files to process
 * @param options - Processing options
 * @returns Promise<OCRResult[]> - Array of OCR results
 */
export async function processMultipleDocumentsOCR(
  files: File[],
  options: OCRProcessingOptions = {}
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];
  
  for (const file of files) {
    try {
      const result = await processDocumentOCR(file, options);
      results.push(result);
    } catch (error) {
      results.push({
        text: '',
        source: 'error',
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

/**
 * Validate OCR result quality
 * @param result - OCR result to validate
 * @returns boolean - True if result meets quality threshold
 */
export function validateOCRQuality(result: OCRResult): boolean {
  if (!result.text || result.text.trim().length === 0) {
    return false;
  }
  
  // Check minimum text length (at least 50 characters)
  if (result.text.trim().length < 50) {
    return false;
  }
  
  // Check confidence if available
  if (result.confidence !== undefined && result.confidence < 0.7) {
    return false;
  }
  
  return true;
} 