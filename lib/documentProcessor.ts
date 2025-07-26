import OpenAI from 'openai';
import { TextExtractionResult, DocumentAnalysisResult } from './extractTextFromPdf';

export interface DocumentProcessingResult {
  success: boolean;
  status: 'success' | 'error' | 'fallback_used';
  extractedText: string;
  summaryText?: string;
  documentType?: string;
  confidence: 'high' | 'medium' | 'low';
  method: string;
  errorMessage?: string;
  suggestions?: string[];
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    fileSize: number;
    processingTime: number;
  };
}

export interface ProcessingOptions {
  enableOCR?: boolean;
  maxFileSize?: number; // in bytes
  timeout?: number; // in milliseconds
  retryAttempts?: number;
}

/**
 * Main document processing pipeline
 */
export async function processDocument(
  file: File | Buffer,
  fileName: string,
  options: ProcessingOptions = {}
): Promise<DocumentProcessingResult> {
  const startTime = Date.now();
  const {
    enableOCR = true,
    maxFileSize = 10 * 1024 * 1024, // 10MB
    timeout = 30000, // 30 seconds
    retryAttempts = 2
  } = options;

  try {
    console.log(`🔄 Starting document processing: ${fileName}`);

    // 1. Validation
    const validation = await validateDocument(file, fileName, maxFileSize);
    if (!validation.valid) {
      return {
        success: false,
        status: 'error',
        extractedText: '',
        confidence: 'low',
        method: 'validation',
        errorMessage: validation.error,
        suggestions: validation.suggestions,
        metadata: {
          fileSize: file instanceof File ? file.size : file.length,
          processingTime: Date.now() - startTime
        }
      };
    }

    // 2. Determine file type and processing strategy
    const fileType = getFileType(file, fileName);
    console.log(`📄 File type detected: ${fileType}`);

    // 3. Process based on file type
    let result: DocumentProcessingResult;

    switch (fileType) {
      case 'pdf':
        result = await processPDF(file, fileName, { enableOCR, retryAttempts });
        break;
      case 'docx':
        result = await processDOCX(file, fileName, { retryAttempts });
        break;
      case 'txt':
        result = await processTXT(file, fileName);
        break;
      case 'image':
        result = await processImage(file, fileName, { enableOCR });
        break;
      default:
        result = {
          success: false,
          status: 'error',
          extractedText: '',
          confidence: 'low',
          method: 'unsupported',
          errorMessage: `Unsupported file type: ${fileType}`,
          suggestions: [
            'Convert to PDF format',
            'Upload a text-based version',
            'Use supported formats: PDF, DOCX, TXT, JPG, PNG'
          ],
          metadata: {
            fileSize: file instanceof File ? file.size : file.length,
            processingTime: Date.now() - startTime
          }
        };
    }

    // 4. Add metadata
    result.metadata = {
      ...result.metadata,
      fileSize: file instanceof File ? file.size : file.length,
      processingTime: Date.now() - startTime
    };

    console.log(`✅ Document processing completed: ${result.status} (${result.metadata.processingTime}ms)`);
    return result;

  } catch (error) {
    console.error(`❌ Document processing failed: ${fileName}`, error);
    
    return {
      success: false,
      status: 'error',
      extractedText: '',
      confidence: 'low',
      method: 'exception',
      errorMessage: 'Document processing failed unexpectedly',
      suggestions: [
        'Check that the file is not corrupted',
        'Try uploading a different version',
        'Ensure the file is in a supported format',
        'Contact support if the problem persists'
      ],
      metadata: {
        fileSize: file instanceof File ? file.size : file.length,
        processingTime: Date.now() - startTime
      }
    };
  }
}

/**
 * Validate document before processing
 */
async function validateDocument(
  file: File | Buffer,
  fileName: string,
  maxFileSize: number
): Promise<{ valid: boolean; error?: string; suggestions?: string[] }> {
  const fileSize = file instanceof File ? file.size : file.length;

  // Check file size
  if (fileSize > maxFileSize) {
    return {
      valid: false,
      error: `File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB)`,
      suggestions: [
        'Compress the file',
        'Split into smaller files',
        `Keep files under ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`
      ]
    };
  }

  // Check for empty files
  if (fileSize === 0) {
    return {
      valid: false,
      error: 'File is empty',
      suggestions: [
        'Select a valid file with content',
        'Check that the file is not corrupted'
      ]
    };
  }

  // Check file extension
  const extension = fileName.split('.').pop()?.toLowerCase();
  const supportedExtensions = ['pdf', 'docx', 'doc', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
  
  if (!extension || !supportedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file extension: .${extension}`,
      suggestions: [
        'Convert to PDF format',
        'Upload a text-based version',
        `Use supported formats: ${supportedExtensions.map(ext => '.' + ext).join(', ')}`
      ]
    };
  }

  return { valid: true };
}

/**
 * Determine file type from file and filename
 */
function getFileType(file: File | Buffer, fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') return 'pdf';
  if (extension === 'docx' || extension === 'doc') return 'docx';
  if (extension === 'txt') return 'txt';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) return 'image';
  
  return 'unknown';
}

/**
 * Process PDF documents with multiple fallback methods
 */
async function processPDF(
  file: File | Buffer,
  fileName: string,
  options: { enableOCR: boolean; retryAttempts: number }
): Promise<DocumentProcessingResult> {
  const { enableOCR, retryAttempts } = options;
  
  // Method 1: Try OpenAI Vision API (primary)
  try {
    console.log('🔄 Attempting OpenAI Vision extraction...');
    const openaiResult = await extractWithOpenAI(file, fileName);
    
    if (openaiResult.text && openaiResult.text.trim().length > 100) {
      return {
        success: true,
        status: 'success',
        extractedText: openaiResult.text,
        confidence: openaiResult.confidence,
        method: 'openai-vision',
        metadata: {
          wordCount: openaiResult.text.split(/\s+/).length
        }
      };
    }
  } catch (error) {
    console.warn('⚠️ OpenAI Vision extraction failed:', error);
  }

  // Method 2: Try pdf-parse (fallback)
  try {
    console.log('🔄 Attempting pdf-parse extraction...');
    const pdfParseResult = await extractWithPdfParse(file);
    
    if (pdfParseResult.text && pdfParseResult.text.trim().length > 50) {
      return {
        success: true,
        status: pdfParseResult.confidence === 'high' ? 'success' : 'fallback_used',
        extractedText: pdfParseResult.text,
        confidence: pdfParseResult.confidence,
        method: 'pdf-parse',
        metadata: {
          pageCount: pdfParseResult.pageCount,
          wordCount: pdfParseResult.wordCount
        }
      };
    }
  } catch (error) {
    console.warn('⚠️ pdf-parse extraction failed:', error);
  }

  // Method 3: OCR (if enabled and text extraction failed)
  if (enableOCR) {
    try {
      console.log('🔄 Attempting OCR extraction...');
      const ocrResult = await extractWithOCR(file, fileName);
      
      return {
        success: true,
        status: 'fallback_used',
        extractedText: ocrResult.text,
        confidence: 'low',
        method: 'ocr',
        errorMessage: 'Document appears to be scanned. OCR processing was used.',
        suggestions: [
          'For better results, upload a text-based version',
          'Convert scanned document to searchable PDF',
          'Use higher quality scans for better OCR results'
        ],
        metadata: {
          wordCount: ocrResult.text.split(/\s+/).length
        }
      };
    } catch (error) {
      console.warn('⚠️ OCR extraction failed:', error);
    }
  }

  // All methods failed
  return {
    success: false,
    status: 'error',
    extractedText: '',
    confidence: 'low',
    method: 'all-failed',
    errorMessage: 'Unable to extract text from PDF document',
    suggestions: [
      'The document may be scanned or image-based',
      'Try uploading a text-based version',
      'Convert to searchable PDF format',
      'Use OCR processing service',
      'Contact support for manual processing'
    ]
  };
}

/**
 * Process DOCX documents
 */
async function processDOCX(
  file: File | Buffer,
  fileName: string,
  options: { retryAttempts: number }
): Promise<DocumentProcessingResult> {
  const { retryAttempts } = options;

  // Method 1: Try OpenAI Vision API (primary)
  try {
    console.log('🔄 Attempting OpenAI Vision extraction for DOCX...');
    const openaiResult = await extractWithOpenAI(file, fileName);
    
    if (openaiResult.text && openaiResult.text.trim().length > 50) {
      return {
        success: true,
        status: 'success',
        extractedText: openaiResult.text,
        confidence: 'high',
        method: 'openai-vision',
        metadata: {
          wordCount: openaiResult.text.split(/\s+/).length
        }
      };
    }
  } catch (error) {
    console.warn('⚠️ OpenAI Vision extraction for DOCX failed:', error);
  }

  // Method 2: Try mammoth.js (fallback)
  try {
    console.log('🔄 Attempting mammoth.js extraction...');
    const mammothResult = await extractWithMammoth(file);
    
    if (mammothResult.text && mammothResult.text.trim().length > 50) {
      return {
        success: true,
        status: 'fallback_used',
        extractedText: mammothResult.text,
        confidence: 'medium',
        method: 'mammoth',
        metadata: {
          wordCount: mammothResult.text.split(/\s+/).length
        }
      };
    }
  } catch (error) {
    console.warn('⚠️ mammoth.js extraction failed:', error);
  }

  // All methods failed
  return {
    success: false,
    status: 'error',
    extractedText: '',
    confidence: 'low',
    method: 'all-failed',
    errorMessage: 'Unable to extract text from Word document',
    suggestions: [
      'Convert the document to PDF format',
      'Save as plain text (.txt)',
      'Copy and paste content into a text file',
      'Check that the file is not corrupted',
      'Try a different Word document'
    ]
  };
}

/**
 * Process text files
 */
async function processTXT(file: File | Buffer, fileName: string): Promise<DocumentProcessingResult> {
  try {
    console.log('🔄 Processing text file...');
    
    let text: string;
    if (file instanceof File) {
      text = await file.text();
    } else {
      text = file.toString('utf-8');
    }

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        status: 'error',
        extractedText: '',
        confidence: 'low',
        method: 'empty-text',
        errorMessage: 'Text file is empty',
        suggestions: [
          'Check that the file contains text content',
          'Ensure the file is not corrupted',
          'Try a different text file'
        ]
      };
    }

    return {
      success: true,
      status: 'success',
      extractedText: text,
      confidence: 'high',
      method: 'direct-text',
      metadata: {
        wordCount: text.split(/\s+/).length
      }
    };
  } catch (error) {
    console.error('❌ Text file processing failed:', error);
    
    return {
      success: false,
      status: 'error',
      extractedText: '',
      confidence: 'low',
      method: 'text-processing-failed',
      errorMessage: 'Failed to read text file',
      suggestions: [
        'Check file encoding (use UTF-8)',
        'Ensure the file is not corrupted',
        'Try opening the file in a text editor first',
        'Convert to a different format'
      ]
    };
  }
}

/**
 * Process image files
 */
async function processImage(
  file: File | Buffer,
  fileName: string,
  options: { enableOCR: boolean }
): Promise<DocumentProcessingResult> {
  const { enableOCR } = options;

  if (!enableOCR) {
    return {
      success: false,
      status: 'error',
      extractedText: '',
      confidence: 'low',
      method: 'ocr-disabled',
      errorMessage: 'OCR processing is disabled for images',
      suggestions: [
        'Enable OCR processing',
        'Upload a text-based document instead',
        'Convert image to PDF with embedded text'
      ]
    };
  }

  try {
    console.log('🔄 Processing image with OCR...');
    const ocrResult = await extractWithOCR(file, fileName);
    
    if (ocrResult.text && ocrResult.text.trim().length > 10) {
      return {
        success: true,
        status: 'fallback_used',
        extractedText: ocrResult.text,
        confidence: 'medium',
        method: 'ocr',
        errorMessage: 'Image processed with OCR. Results may vary.',
        suggestions: [
          'For better results, use text-based documents',
          'Ensure image contains clear, readable text',
          'Use higher resolution images',
          'Convert to PDF with embedded text'
        ],
        metadata: {
          wordCount: ocrResult.text.split(/\s+/).length
        }
      };
    } else {
      return {
        success: false,
        status: 'error',
        extractedText: '',
        confidence: 'low',
        method: 'ocr-no-text',
        errorMessage: 'No readable text found in image',
        suggestions: [
          'Ensure the image contains clear text',
          'Use a higher resolution image',
          'Upload a text-based document instead',
          'Check that the image is not too blurry or low quality'
        ]
      };
    }
  } catch (error) {
    console.error('❌ Image OCR processing failed:', error);
    
    return {
      success: false,
      status: 'error',
      extractedText: '',
      confidence: 'low',
      method: 'ocr-failed',
      errorMessage: 'OCR processing failed',
      suggestions: [
        'Try a different image',
        'Use a text-based document instead',
        'Ensure image is clear and readable',
        'Convert to PDF format'
      ]
    };
  }
}

/**
 * Extract text using OpenAI Vision API
 */
async function extractWithOpenAI(file: File | Buffer, fileName: string): Promise<{ text: string; confidence: 'high' | 'medium' | 'low' }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // Convert file to base64
  let base64: string;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    base64 = Buffer.from(arrayBuffer).toString('base64');
  } else {
    base64 = file.toString('base64');
  }

  // Determine MIME type
  const extension = fileName.split('.').pop()?.toLowerCase();
  let mimeType = 'application/octet-stream';
  if (extension === 'pdf') mimeType = 'application/pdf';
  else if (extension === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (extension === 'txt') mimeType = 'text/plain';
  else if (['jpg', 'jpeg'].includes(extension || '')) mimeType = 'image/jpeg';
  else if (extension === 'png') mimeType = 'image/png';

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all readable text from this document. If it's a scanned document or image, describe what you can see. Return only the extracted text without any additional commentary or formatting. If the document appears to be scanned or image-based, mention this clearly."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`
            }
          }
        ]
      }
    ],
    max_tokens: 4000
  });

  const extractedText = response.choices[0].message.content || '';
  
  // Determine confidence based on content
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (extractedText.includes('scanned') || extractedText.includes('image')) {
    confidence = 'low';
  } else if (extractedText.length < 100) {
    confidence = 'medium';
  }

  return { text: extractedText, confidence };
}

/**
 * Extract text using pdf-parse
 */
async function extractWithPdfParse(file: File | Buffer): Promise<{ text: string; confidence: 'high' | 'medium' | 'low'; pageCount?: number; wordCount?: number }> {
  const { default: pdfParse } = await import('pdf-parse');
  
  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }

  const pdfData = await pdfParse(buffer);
  const extractedText = pdfData.text || '';
  
  // Determine confidence based on text length
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (extractedText.trim().length < 100) {
    confidence = 'low';
  } else if (extractedText.trim().length < 500) {
    confidence = 'medium';
  }

  return {
    text: extractedText,
    confidence,
    pageCount: pdfData.numpages,
    wordCount: extractedText.split(/\s+/).length
  };
}

/**
 * Extract text using mammoth.js for DOCX files
 */
async function extractWithMammoth(file: File | Buffer): Promise<{ text: string; confidence: 'high' | 'medium' | 'low' }> {
  const mammoth = await import('mammoth');
  
  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }

  const result = await mammoth.extractRawText({ buffer });
  const extractedText = result.value || '';
  
  return {
    text: extractedText,
    confidence: extractedText.length > 100 ? 'high' : 'medium'
  };
}

/**
 * Extract text using OCR (placeholder implementation)
 */
async function extractWithOCR(file: File | Buffer, fileName: string): Promise<{ text: string; confidence: 'high' | 'medium' | 'low' }> {
  // This is a placeholder for OCR implementation
  // In production, you would integrate with:
  // - Google Vision API
  // - Azure Computer Vision
  // - AWS Textract
  // - Tesseract.js (client-side)
  
  console.log('🔄 OCR processing placeholder - would integrate with OCR service');
  
  // For now, return a helpful message
  return {
    text: 'OCR processing is not yet implemented. Please upload a text-based version of the document or contact support for OCR processing.',
    confidence: 'low'
  };
}

/**
 * Generate summary from extracted text
 */
export async function generateDocumentSummary(
  extractedText: string,
  fileName: string,
  documentType?: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return 'Summary generation not available (OpenAI API key not configured)';
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const prompt = `Please provide a concise summary of the following document. Focus on key findings, important dates, compliance requirements, and any action items.

Document: ${fileName}
Type: ${documentType || 'Unknown'}

Content:
${extractedText.substring(0, 3000)}${extractedText.length > 3000 ? '...' : ''}

Please provide a 2-3 sentence summary in British English:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200
    });

    return response.choices[0].message.content || 'Unable to generate summary';
  } catch (error) {
    console.error('❌ Summary generation failed:', error);
    return 'Summary generation failed. Please review the document manually.';
  }
} 