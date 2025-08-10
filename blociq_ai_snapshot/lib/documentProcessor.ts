import OpenAI from 'openai';
import { extractTextFromPDF } from './extractTextFromPdf';

export interface DocumentProcessingResult {
  success: boolean;
  status: 'success' | 'error' | 'fallback_used';
  extractedText: string;
  summaryText?: string;
  documentType?: string;
  confidence: 'high' | 'medium' | 'low';
  extractionMethod: string;
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
    // Convert File to Buffer if needed
    const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
    const fileName = file instanceof File ? file.name : 'unknown';
    const fileSize = buffer.length;

    console.log(`📄 Processing document: ${fileName} (${fileSize} bytes)`);

    // 1. Validation
    const validation = validateDocument(buffer, fileName, maxFileSize);
    if (!validation.valid) {
      return {
        success: false,
        status: 'error',
        extractedText: '',
        confidence: 'low',
        extractionMethod: 'validation',
        errorMessage: validation.error,
        suggestions: validation.suggestions,
        metadata: {
          fileSize,
          processingTime: Date.now() - startTime
        }
      };
    }

    // 2. Determine file type and processing strategy
    const fileType = detectFileType(fileName, buffer);
    console.log(`🔍 Detected file type: ${fileType}`);

    // 3. Process based on file type
    let result: DocumentProcessingResult;

    switch (fileType) {
      case 'pdf':
        result = await processPDF(buffer, fileName, { enableOCR, retryAttempts });
        break;
      case 'docx':
        result = await processDOCX(buffer, fileName, { retryAttempts });
        break;
      case 'txt':
        result = await processTXT(buffer, fileName);
        break;
      case 'image':
        result = await processImage(buffer, fileName, { enableOCR });
        break;
      default:
        result = {
          success: false,
          status: 'error',
          extractedText: '',
          confidence: 'low',
          extractionMethod: 'unknown',
          errorMessage: `Unsupported file type: ${fileType}`,
          suggestions: [
            'Convert to PDF format',
            'Save as plain text (.txt)',
            'Use a supported file type'
          ],
          metadata: {
            fileSize,
            processingTime: Date.now() - startTime
          }
        };
    }

    // 4. Add metadata
    result.metadata = {
      ...result.metadata,
      fileSize,
      processingTime: Date.now() - startTime
    };

    // 5. Generate summary if text was extracted
    if (result.success && result.extractedText.length > 50) {
      result.summaryText = await generateSummary(result.extractedText, fileName);
    }

    console.log(`✅ Document processing completed: ${result.status} (${result.metadata.processingTime}ms)`);
    return result;

  } catch (error) {
    console.error('❌ Document processing failed:', error);
    return {
      success: false,
      status: 'error',
      extractedText: '',
      confidence: 'low',
      extractionMethod: 'exception',
      errorMessage: 'Document processing failed unexpectedly',
      suggestions: [
        'Check that the file is not corrupted',
        'Try uploading a different version',
        'Ensure the file is in a supported format',
        'Contact support if the problem persists'
      ],
      metadata: {
        fileSize: file instanceof File ? file.size : 0,
        processingTime: Date.now() - startTime
      }
    };
  }
}

/**
 * Validate document before processing
 */
function validateDocument(
  buffer: Buffer,
  fileName: string,
  maxFileSize: number
): { valid: boolean; error?: string; suggestions?: string[] } {
  // Check file size
  if (buffer.length > maxFileSize) {
    return {
      valid: false,
      error: 'File too large',
      suggestions: [
        'Compress the file',
        'Split into smaller files',
        `Keep files under ${Math.round(maxFileSize / 1024 / 1024)}MB`
      ]
    };
  }

  // Check for empty files
  if (buffer.length === 0) {
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
      error: 'Unsupported file type',
      suggestions: [
        'Convert to PDF format',
        'Save as plain text (.txt)',
        `Use one of these formats: ${supportedExtensions.join(', ')}`
      ]
    };
  }

  return { valid: true };
}

/**
 * Detect file type from filename and content
 */
function detectFileType(fileName: string, buffer: Buffer): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'txt':
      return 'txt';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'image';
    default:
      return 'unknown';
  }
}

/**
 * Process PDF documents with multiple fallback methods
 */
async function processPDF(
  buffer: Buffer,
  fileName: string,
  options: { enableOCR: boolean; retryAttempts: number }
): Promise<DocumentProcessingResult> {
  const { enableOCR, retryAttempts } = options;
  
  // Method 1: Try pdf-parse (fastest, works for text-based PDFs)
  try {
    console.log('🔄 Attempting pdf-parse extraction...');
    const result = await extractTextFromPDF(buffer, fileName);
    
    if (result.text && result.text.trim().length > 100) {
      return {
        success: true,
        status: 'success',
        extractedText: result.text,
        confidence: result.confidence,
        extractionMethod: 'pdf-parse',
        metadata: {
          pageCount: result.pageCount,
          wordCount: result.wordCount
        }
      };
    }
  } catch (error) {
    console.log('⚠️ pdf-parse failed, trying OpenAI Vision...');
  }

  // Method 2: Try OpenAI Vision API
  try {
    console.log('🔄 Attempting OpenAI Vision extraction...');
    const result = await extractWithOpenAI(buffer, 'pdf');
    
    if (result.text && result.text.trim().length > 50) {
      return {
        success: true,
        status: result.confidence === 'low' ? 'fallback_used' : 'success',
        extractedText: result.text,
        confidence: result.confidence,
        extractionMethod: 'openai-vision',
        metadata: {
          wordCount: result.text.split(/\s+/).length
        }
      };
    }
  } catch (error) {
    console.log('⚠️ OpenAI Vision failed, trying OCR...');
  }

  // Method 3: OCR (if enabled)
  if (enableOCR) {
    try {
      console.log('🔄 Attempting OCR extraction...');
      const result = await extractWithOCR(buffer, fileName);
      
      return {
        success: true,
        status: 'fallback_used',
        extractedText: result.text,
        confidence: 'low',
        extractionMethod: 'ocr',
        suggestions: [
          'This appears to be a scanned document',
          'Consider uploading a text-based version for better results',
          'OCR processing was used to extract text'
        ],
        metadata: {
          wordCount: result.text.split(/\s+/).length
        }
      };
    } catch (error) {
      console.log('⚠️ OCR failed');
    }
  }

  // All methods failed
  return {
    success: false,
    status: 'error',
    extractedText: '',
    confidence: 'low',
    extractionMethod: 'all_failed',
    errorMessage: 'Unable to extract text from PDF',
    suggestions: [
      'This may be a scanned document - try OCR processing',
      'Upload a text-based version of the document',
      'Convert to a searchable PDF format',
      'Contact support for manual processing'
    ]
  };
}

/**
 * Process DOCX documents
 */
async function processDOCX(
  buffer: Buffer,
  fileName: string,
  options: { retryAttempts: number }
): Promise<DocumentProcessingResult> {
  const { retryAttempts } = options;

  // Method 1: Try mammoth.js (if available)
  try {
    console.log('🔄 Attempting mammoth.js extraction...');
    const result = await extractWithMammoth(buffer);
    
    if (result.text && result.text.trim().length > 50) {
      return {
        success: true,
        status: 'success',
        extractedText: result.text,
        confidence: 'high',
        extractionMethod: 'mammoth',
        metadata: {
          wordCount: result.text.split(/\s+/).length
        }
      };
    }
  } catch (error) {
    console.log('⚠️ mammoth.js failed, trying OpenAI Vision...');
  }

  // Method 2: Try OpenAI Vision API
  try {
    console.log('🔄 Attempting OpenAI Vision extraction...');
    const result = await extractWithOpenAI(buffer, 'docx');
    
    if (result.text && result.text.trim().length > 50) {
      return {
        success: true,
        status: 'fallback_used',
        extractedText: result.text,
        confidence: 'medium',
        extractionMethod: 'openai-vision',
        metadata: {
          wordCount: result.text.split(/\s+/).length
        }
      };
    }
  } catch (error) {
    console.log('⚠️ OpenAI Vision failed');
  }

  // All methods failed
  return {
    success: false,
    status: 'error',
    extractedText: '',
    confidence: 'low',
    extractionMethod: 'all_failed',
    errorMessage: 'Unable to extract text from Word document',
    suggestions: [
      'Convert the document to PDF format',
      'Save as plain text (.txt)',
      'Copy and paste content into a text file',
      'Try a different document format'
    ]
  };
}

/**
 * Process plain text files
 */
async function processTXT(buffer: Buffer, fileName: string): Promise<DocumentProcessingResult> {
  try {
    const text = buffer.toString('utf-8');
    
    if (text.trim().length === 0) {
      return {
        success: false,
        status: 'error',
        extractedText: '',
        confidence: 'low',
        extractionMethod: 'text',
        errorMessage: 'Text file is empty',
        suggestions: [
          'Check that the file contains text content',
          'Ensure the file is not corrupted'
        ]
      };
    }

    return {
      success: true,
      status: 'success',
      extractedText: text,
      confidence: 'high',
      extractionMethod: 'text',
      metadata: {
        wordCount: text.split(/\s+/).length
      }
    };
  } catch (error) {
    return {
      success: false,
      status: 'error',
      extractedText: '',
      confidence: 'low',
      extractionMethod: 'text',
      errorMessage: 'Unable to read text file',
      suggestions: [
        'Check file encoding (use UTF-8)',
        'Ensure the file is not corrupted',
        'Try saving as plain text again'
      ]
    };
  }
}

/**
 * Process image files
 */
async function processImage(
  buffer: Buffer,
  fileName: string,
  options: { enableOCR: boolean }
): Promise<DocumentProcessingResult> {
  const { enableOCR } = options;

  // Method 1: Try OpenAI Vision API
  try {
    console.log('🔄 Attempting OpenAI Vision extraction...');
    const result = await extractWithOpenAI(buffer, 'image');
    
    if (result.text && result.text.trim().length > 20) {
      return {
        success: true,
        status: 'fallback_used',
        extractedText: result.text,
        confidence: result.confidence,
        extractionMethod: 'openai-vision',
        metadata: {
          wordCount: result.text.split(/\s+/).length
        }
      };
    }
  } catch (error) {
    console.log('⚠️ OpenAI Vision failed');
  }

  // Method 2: OCR (if enabled)
  if (enableOCR) {
    try {
      console.log('🔄 Attempting OCR extraction...');
      const result = await extractWithOCR(buffer, fileName);
      
      return {
        success: true,
        status: 'fallback_used',
        extractedText: result.text,
        confidence: 'low',
        extractionMethod: 'ocr',
        suggestions: [
          'This image was processed using OCR',
          'For better results, use higher resolution images',
          'Consider uploading a text-based document'
        ],
        metadata: {
          wordCount: result.text.split(/\s+/).length
        }
      };
    } catch (error) {
      console.log('⚠️ OCR failed');
    }
  }

  // All methods failed
  return {
    success: false,
    status: 'error',
    extractedText: '',
    confidence: 'low',
    extractionMethod: 'all_failed',
    errorMessage: 'Unable to extract text from image',
    suggestions: [
      'Ensure the image contains clear, readable text',
      'Try a higher resolution image',
      'Use a text-based document instead',
      'Convert image to PDF with embedded text'
    ]
  };
}

/**
 * Extract text using OpenAI Vision API
 */
async function extractWithOpenAI(buffer: Buffer, fileType: string): Promise<{ text: string; confidence: 'high' | 'medium' | 'low' }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const base64 = buffer.toString('base64');

  const prompt = fileType === 'pdf' 
    ? "Extract all readable text from this PDF document. If it's a scanned document or image, describe what you can see. Return only the extracted text without any additional commentary."
    : fileType === 'docx'
    ? "Extract all the text content from this Word document. Return only the extracted text without any additional commentary or formatting."
    : "Extract all readable text from this image. If there's no text, describe what you can see. Return only the extracted text or description without additional commentary.";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${fileType === 'pdf' ? 'application/pdf' : fileType === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'image/jpeg'};base64,${base64}`
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
  if (extractedText.includes('scanned') || extractedText.includes('image') || extractedText.length < 100) {
    confidence = 'low';
  } else if (extractedText.length < 500) {
    confidence = 'medium';
  }

  return { text: extractedText, confidence };
}

/**
 * Extract text using mammoth.js (DOCX)
 */
async function extractWithMammoth(buffer: Buffer): Promise<{ text: string }> {
  try {
    // Dynamic import to avoid SSR issues
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  } catch (error) {
    console.error('mammoth.js extraction failed:', error);
    throw error;
  }
}

/**
 * Extract text using OCR (placeholder implementation)
 */
async function extractWithOCR(buffer: Buffer, fileName: string): Promise<{ text: string }> {
  // This is a placeholder for OCR integration
  // In production, you would integrate with:
  // - Google Vision API
  // - Azure Computer Vision
  // - Tesseract.js (client-side)
  // - AWS Textract
  
  console.log('🔄 OCR processing placeholder - would integrate with OCR service');
  
  // For now, return a helpful message
  return {
    text: `OCR processing would be applied to ${fileName}. This is a placeholder for OCR service integration. Please contact support for OCR processing.`
  };
}

/**
 * Generate a summary of extracted text
 */
async function generateSummary(text: string, fileName: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return 'Summary generation requires OpenAI API key';
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a document summarization assistant. Provide a concise, 2-3 sentence summary of the document content."
        },
        {
          role: "user",
          content: `Summarize this document (${fileName}):\n\n${text.substring(0, 3000)}`
        }
      ],
      max_tokens: 200
    });

    return response.choices[0].message.content || 'Unable to generate summary';
  } catch (error) {
    console.error('Summary generation failed:', error);
    return 'Summary generation failed';
  }
} 