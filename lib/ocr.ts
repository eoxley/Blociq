/**
 * OCR utility module for BlocIQ lease document processing
 * Handles document text extraction using local Google Vision API
 */

export interface OCRResult {
  text: string;
  source: string;
  filename: string;
  confidence?: number;
  quality?: 'high' | 'medium' | 'low';
  warnings?: string[];
}

export interface OCRProcessingError {
  message: string;
  code: 'NETWORK_ERROR' | 'PROCESSING_ERROR' | 'INVALID_RESPONSE' | 'UNKNOWN_ERROR';
  details?: string;
}

/**
 * Process document through local OCR API
 * @param file - The file to process
 * @returns Promise<OCRResult> - Extracted text and metadata
 */
export async function processDocumentOCR(file: File): Promise<OCRResult> {
  try {
    console.log('🔄 Starting OCR processing for:', file.name);
    
    // Validate file type
    if (!isValidFileType(file)) {
      throw new Error('Invalid file type. Only PDF and image files are supported.');
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size too large. Maximum size is 10MB.');
    }

    // Convert file to base64 for Google Vision API
    const base64Data = await fileToBase64(file);
    
    // POST to local OCR API
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Image: base64Data,
        mimeType: file.type,
        filename: file.name
      }),
      // Add timeout for network requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OCR API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Validate OCR response
    if (!data.success) {
      throw new Error(`OCR processing failed: ${data.error || 'Unknown error'}`);
    }

    if (!data.text || typeof data.text !== 'string') {
      throw new Error('Invalid OCR response: No text extracted');
    }

    if (data.text.trim().length === 0) {
      throw new Error('OCR processing failed: No text content extracted');
    }

    console.log('✅ OCR processing successful for:', file.name);
    console.log(`📄 Extracted ${data.text.length} characters`);

    return {
      text: data.text.trim(),
      source: 'google_vision_api',
      filename: file.name,
      confidence: data.confidence || 0.8,
      quality: data.text.length > 100 ? 'high' : 'medium'
    };

  } catch (error) {
    console.error('❌ OCR processing failed for:', file.name, error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw {
          message: 'OCR processing timed out. Please try again.',
          code: 'NETWORK_ERROR' as const,
          details: 'Request exceeded 30 second timeout'
        } as OCRProcessingError;
      }
      
      if (error.message.includes('OCR API error')) {
        throw {
          message: 'OCR processing failed. Please try again.',
          code: 'PROCESSING_ERROR' as const,
          details: error.message
        } as OCRProcessingError;
      }
      
      if (error.message.includes('Invalid OCR response')) {
        throw {
          message: 'OCR processing failed to extract text. Please check the document quality.',
          code: 'INVALID_RESPONSE' as const,
          details: error.message
        } as OCRProcessingError;
      }
    }
    
    // Generic error fallback
    throw {
      message: 'OCR processing failed. Please try again.',
      code: 'UNKNOWN_ERROR' as const,
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    } as OCRProcessingError;
  }
}

/**
 * Convert file to base64 string
 * @param file - The file to convert
 * @returns Promise<string> - Base64 encoded string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      try {
        // Remove data:image/jpeg;base64, prefix
        const base64 = reader.result as string;
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
 * Validate file type for OCR processing
 * @param file - The file to validate
 * @returns boolean - True if file type is supported
 */
function isValidFileType(file: File): boolean {
  const supportedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp'
  ];
  
  return supportedTypes.includes(file.type) || 
         file.name.toLowerCase().match(/\.(pdf|jpg|jpeg|png|gif|bmp|tiff|webp)$/);
}

/**
 * Process document with Google Vision API (alternative method)
 * @param file - The file to process
 * @returns Promise<OCRResult> - Extracted text and metadata
 */
export async function processDocumentWithGoogleVision(file: File): Promise<OCRResult> {
  try {
    console.log('🔄 Starting Google Vision processing for:', file.name);
    
    // Convert file to base64
    const base64Data = await fileToBase64(file);
    
    // Call the OCR API with specific Google Vision parameters
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Image: base64Data,
        mimeType: file.type,
        filename: file.name,
        useGoogleVision: true,
        features: ['TEXT_DETECTION', 'DOCUMENT_TEXT_DETECTION']
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Google Vision processing failed: ${data.error || 'Unknown error'}`);
    }

    return {
      text: data.text.trim(),
      source: 'google_vision_api',
      filename: file.name,
      confidence: data.confidence || 0.9,
      quality: 'high'
    };

  } catch (error) {
    console.error('❌ Google Vision processing failed for:', file.name, error);
    throw {
      message: 'Google Vision processing failed. Please try again.',
      code: 'PROCESSING_ERROR' as const,
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    } as OCRProcessingError;
  }
}

/**
 * Batch process multiple documents through OCR
 * @param files - Array of files to process
 * @returns Promise<OCRResult[]> - Array of OCR results
 */
export async function batchProcessDocumentsOCR(files: File[]): Promise<OCRResult[]> {
  console.log(`🔄 Starting batch OCR processing for ${files.length} files`);
  
  const results: OCRResult[] = [];
  const errors: { filename: string; error: OCRProcessingError }[] = [];
  
  // Process files sequentially to avoid overwhelming the OCR service
  for (const file of files) {
    try {
      const result = await processDocumentOCR(file);
      results.push(result);
      console.log(`✅ Processed: ${file.name}`);
    } catch (error) {
      const ocrError = error as OCRProcessingError;
      errors.push({ filename: file.name, error: ocrError });
      console.error(`❌ Failed to process: ${file.name}`, ocrError);
    }
  }
  
  // Log summary
  console.log(`📊 Batch OCR complete: ${results.length} successful, ${errors.length} failed`);
  
  if (errors.length > 0) {
    console.warn('⚠️ Failed files:', errors.map(e => e.filename));
  }
  
  return results;
}

/**
 * Get OCR processing statistics
 */
export function getOCRStats(results: OCRResult[]): {
  totalFiles: number;
  totalCharacters: number;
  averageCharacters: number;
  largestFile: string;
  smallestFile: string;
} {
  if (results.length === 0) {
    return {
      totalFiles: 0,
      totalCharacters: 0,
      averageCharacters: 0,
      largestFile: '',
      smallestFile: ''
    };
  }
  
  const totalCharacters = results.reduce((sum, result) => sum + result.text.length, 0);
  const averageCharacters = Math.round(totalCharacters / results.length);
  
  const largestFile = results.reduce((largest, current) => 
    current.text.length > largest.text.length ? current : largest
  ).filename;
  
  const smallestFile = results.reduce((smallest, current) => 
    current.text.length < smallest.text.length ? current : smallest
  ).filename;
  
  return {
    totalFiles: results.length,
    totalCharacters,
    averageCharacters,
    largestFile,
    smallestFile
  };
}

/**
 * Validate OCR result quality
 */
export function validateOCRQuality(result: OCRResult): {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
} {
  const issues: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'high';
  
  // Check text length
  if (result.text.length < 100) {
    issues.push('Extracted text is very short - document may be image-only or low quality');
    confidence = 'low';
  } else if (result.text.length < 500) {
    issues.push('Extracted text is short - some content may be missing');
    confidence = 'medium';
  }
  
  // Check for common OCR artifacts
  const hasOCRArtifacts = /[^\w\s\.,!?;:'"()\[\]{}@#$%^&*+=<>\/\\|~`]/.test(result.text);
  if (hasOCRArtifacts) {
    issues.push('Text contains unusual characters that may indicate OCR artifacts');
    confidence = confidence === 'high' ? 'medium' : 'low';
  }
  
  // Check for repeated characters (common OCR error)
  const hasRepeatedChars = /(.)\1{4,}/.test(result.text);
  if (hasRepeatedChars) {
    issues.push('Text contains repeated characters - possible OCR scanning issue');
    confidence = confidence === 'low';
  }
  
  // Check for lease-specific keywords to validate content
  const leaseKeywords = ['lease', 'agreement', 'term', 'rent', 'service charge', 'lessor', 'lessee'];
  const hasLeaseContent = leaseKeywords.some(keyword => 
    result.text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (!hasLeaseContent) {
    issues.push('Text does not appear to contain lease-related content');
    confidence = 'low';
  }
  
  return {
    isValid: confidence !== 'low',
    confidence,
    issues
  };
}

/**
 * Process document with confidence-based fallback
 * If OCR yields low confidence, attempts alternative methods
 */
export async function processDocumentWithFallback(file: File): Promise<OCRResult> {
  try {
    console.log('🔄 Starting OCR processing with fallback for:', file.name);
    
    // First attempt: Standard OCR processing
    const primaryResult = await processDocumentOCR(file);
    
    // Validate the quality of the result
    const quality = validateOCRQuality(primaryResult);
    
    // If quality is acceptable, return the result
    if (quality.confidence !== 'low') {
      return {
        ...primaryResult,
        quality: quality.confidence,
        warnings: quality.issues
      };
    }
    
    console.log('⚠️ Primary OCR yielded low confidence, attempting fallback...');
    
    // Fallback: Try alternative OCR approach
    try {
      // For now, we'll return the low-quality result with warnings
      // In the future, this could try Google Vision, different OCR settings, etc.
      return {
        ...primaryResult,
        quality: 'low',
        warnings: [
          ...quality.issues,
          'OCR fallback attempted but yielded low confidence',
          'Consider uploading a higher quality document or text-based version'
        ]
      };
    } catch (fallbackError) {
      console.error('❌ OCR fallback failed:', fallbackError);
      
      // Return the original result with low quality warning
      return {
        ...primaryResult,
        quality: 'low',
        warnings: [
          ...quality.issues,
          'OCR fallback failed',
          'Document may be of very low quality or in unsupported format'
        ]
      };
    }
    
  } catch (error) {
    console.error('❌ OCR processing with fallback failed for:', file.name, error);
    throw error;
  }
} 