import pdfParse from 'pdf-parse';
import OpenAI from 'openai';

export interface TextExtractionResult {
  text: string;
  confidence: 'high' | 'medium' | 'low';
  method: 'pdf-parse' | 'openai-vision' | 'ocr' | 'fallback';
  pageCount?: number;
  wordCount?: number;
  error?: string;
  suggestions?: string[];
}

export interface DocumentAnalysisResult {
  text: string;
  confidence: 'high' | 'medium' | 'low';
  documentType: string;
  keyPhrases: string[];
  summary: string;
  error?: string;
  suggestions?: string[];
}

/**
 * Enhanced text extraction with multiple fallback methods
 */
export async function extractTextFromPDF(buffer: Buffer, fileName?: string): Promise<TextExtractionResult> {
  const extractionMethods = [
    { name: 'pdf-parse', method: extractWithPdfParse },
    { name: 'openai-vision', method: extractWithOpenAI },
    { name: 'ocr', method: extractWithOCR }
  ];

  for (const { name, method } of extractionMethods) {
    try {
      console.log(`🔄 Attempting ${name} extraction...`);
      const result = await method(buffer, fileName);
      
      if (result.text && result.text.trim().length > 50) {
        console.log(`✅ ${name} extraction successful (${result.text.length} characters)`);
        return {
          ...result,
          method: name as any,
          wordCount: result.text.split(/\s+/).length
        };
      } else {
        console.log(`⚠️ ${name} extraction yielded insufficient content`);
      }
    } catch (error) {
      console.error(`❌ ${name} extraction failed:`, error);
    }
  }

  // All methods failed
  return {
    text: 'Document processing failed. The document may be corrupted, password-protected, or in an unsupported format.',
    confidence: 'low',
    method: 'fallback',
    error: 'All extraction methods failed',
    suggestions: [
      'Try uploading a different version of the document',
      'Ensure the document is not password-protected',
      'Convert the document to PDF format if it\'s in another format',
      'For scanned documents, try using a text-based version',
      'Check that the file is not corrupted'
    ]
  };
}

/**
 * Primary method: pdf-parse
 */
async function extractWithPdfParse(buffer: Buffer, fileName?: string): Promise<Partial<TextExtractionResult>> {
  const pdfData = await pdfParse(buffer);
  const extractedText = pdfData.text || '';
  
  return {
    text: extractedText,
    confidence: extractedText.trim().length > 200 ? 'high' : 'medium',
    pageCount: pdfData.numpages
  };
}

/**
 * Fallback method: OpenAI Vision API
 */
async function extractWithOpenAI(buffer: Buffer, fileName?: string): Promise<Partial<TextExtractionResult>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const base64 = buffer.toString('base64');

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract all readable text from this document. If it's a scanned document or image, describe what you can see. Return only the extracted text without any additional commentary or formatting. If the document appears to be scanned or image-based, mention this clearly.`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:application/pdf;base64,${base64}`
            }
          }
        ]
      }
    ],
    max_tokens: 4000
  });

  const extractedText = response.choices[0].message.content || '';
  
  return {
    text: extractedText,
    confidence: extractedText.includes('scanned') || extractedText.includes('image') ? 'low' : 'high'
  };
}

/**
 * OCR fallback method (placeholder for OCR service integration)
 */
async function extractWithOCR(buffer: Buffer, fileName?: string): Promise<Partial<TextExtractionResult>> {
  // This would integrate with Google Vision API, Azure Computer Vision, or similar OCR service
  // For now, return a helpful message suggesting OCR processing
  
  return {
    text: 'This document appears to be scanned or image-based. OCR processing is recommended for better text extraction. Please try uploading a text-based version of the document or contact support for OCR processing.',
    confidence: 'low',
    suggestions: [
      'Upload a text-based version of the document',
      'Use OCR processing service',
      'Convert scanned document to searchable PDF',
      'Contact support for manual processing'
    ]
  };
}

/**
 * Enhanced text extraction with document type detection and analysis
 */
export async function extractTextWithAnalysis(buffer: Buffer, fileName: string): Promise<DocumentAnalysisResult> {
  try {
    const extractionResult = await extractTextFromPDF(buffer, fileName);
    
    if (extractionResult.error) {
      return {
        text: extractionResult.text,
        confidence: 'low',
        documentType: 'Unknown',
        keyPhrases: [],
        summary: 'Document processing failed. Please try a different file or format.',
        error: extractionResult.error,
        suggestions: extractionResult.suggestions
      };
    }
    
    // Detect document type based on filename and content
    const documentType = detectDocumentType(fileName, extractionResult.text);
    
    // Extract key phrases for better analysis
    const keyPhrases = extractKeyPhrases(extractionResult.text);
    
    // Generate basic summary
    const summary = generateBasicSummary(extractionResult.text, documentType);
    
    return {
      text: extractionResult.text,
      confidence: extractionResult.confidence,
      documentType,
      keyPhrases,
      summary
    };
  } catch (error) {
    console.error('❌ Document analysis failed:', error);
    return {
      text: 'Document analysis failed. Please try again.',
      confidence: 'low',
      documentType: 'Unknown',
      keyPhrases: [],
      summary: 'Unable to analyze document content.',
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestions: [
        'Check that the file is not corrupted',
        'Try uploading a different version',
        'Ensure the document is in a supported format',
        'Contact support if the problem persists'
      ]
    };
  }
}

/**
 * Extract text from various file types with enhanced error handling
 */
export async function extractTextFromFile(file: File): Promise<TextExtractionResult> {
  try {
    console.log(`📄 Processing file: ${file.name} (${file.type})`);
    
    if (file.type === 'text/plain') {
      const text = await file.text();
      return {
        text,
        confidence: 'high',
        method: 'pdf-parse',
        wordCount: text.split(/\s+/).length
      };
    } else if (file.type === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      return await extractTextFromPDF(buffer, file.name);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await extractTextFromDocx(file);
    } else if (file.type.includes('image/')) {
      return await extractTextFromImage(file);
    } else {
      return {
        text: `Unsupported file type: ${file.type}. Please upload PDF, DOCX, TXT, or image files.`,
        confidence: 'low',
        method: 'fallback',
        error: 'Unsupported file type',
        suggestions: [
          'Convert the file to PDF format',
          'Upload a text-based version',
          'Use a supported file type (PDF, DOCX, TXT, JPG, PNG)'
        ]
      };
    }
  } catch (error) {
    console.error('❌ File processing failed:', error);
    return {
      text: `Error processing file: ${file.name}`,
      confidence: 'low',
      method: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestions: [
        'Check that the file is not corrupted',
        'Try uploading a different version',
        'Ensure the file is in a supported format',
        'Contact support if the problem persists'
      ]
    };
  }
}

/**
 * Extract text from DOCX files
 */
async function extractTextFromDocx(file: File): Promise<TextExtractionResult> {
  try {
    // For now, use OpenAI Vision API as a fallback for DOCX
    // In production, you'd use a library like mammoth.js
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all the text content from this Word document. Return only the extracted text without any additional commentary or formatting."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000
    });

    const extractedText = response.choices[0].message.content || '';
    
    return {
      text: extractedText,
      confidence: 'high',
      method: 'openai-vision',
      wordCount: extractedText.split(/\s+/).length
    };
  } catch (error) {
    console.error('❌ DOCX extraction failed:', error);
    return {
      text: `Unable to extract text from Word document: ${file.name}. Please convert to PDF or TXT format.`,
      confidence: 'low',
      method: 'fallback',
      error: 'DOCX extraction failed',
      suggestions: [
        'Convert the document to PDF format',
        'Save as plain text (.txt)',
        'Copy and paste content into a text file',
        'Use a different document format'
      ]
    };
  }
}

/**
 * Extract text from image files
 */
async function extractTextFromImage(file: File): Promise<TextExtractionResult> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all readable text from this image. If there's no text, describe what you can see. Return only the extracted text or description without additional commentary."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000
    });

    const extractedText = response.choices[0].message.content || '';
    
    return {
      text: extractedText,
      confidence: extractedText.length > 50 ? 'medium' : 'low',
      method: 'openai-vision',
      wordCount: extractedText.split(/\s+/).length
    };
  } catch (error) {
    console.error('❌ Image text extraction failed:', error);
    return {
      text: `Unable to extract text from image: ${file.name}. The image may not contain readable text or may be of low quality.`,
      confidence: 'low',
      method: 'fallback',
      error: 'Image text extraction failed',
      suggestions: [
        'Ensure the image contains clear, readable text',
        'Try a higher resolution image',
        'Use a text-based document instead',
        'Convert image to PDF with embedded text'
      ]
    };
  }
}

/**
 * Detect document type based on filename and content
 */
export function detectDocumentType(fileName: string, text: string): string {
  const name = fileName.toLowerCase();
  const content = text.toLowerCase();
  
  // Check filename patterns first
  if (name.includes('asbestos') || content.includes('asbestos')) return 'Asbestos Survey';
  if (name.includes('eicr') || content.includes('electrical installation condition report')) return 'EICR';
  if (name.includes('fire') || content.includes('fire risk assessment')) return 'Fire Risk Assessment';
  if (name.includes('lease') || content.includes('lease agreement')) return 'Lease Agreement';
  if (name.includes('insurance') || content.includes('insurance certificate')) return 'Insurance Certificate';
  if (name.includes('major works') || content.includes('major works')) return 'Major Works Scope';
  if (name.includes('minutes') || content.includes('agm') || content.includes('annual general meeting')) return 'Minutes/AGM';
  if (name.includes('certificate') || content.includes('certificate')) return 'Certificate';
  if (name.includes('report') || content.includes('report')) return 'Report';
  if (name.includes('inspection') || content.includes('inspection')) return 'Inspection Report';
  
  // Default based on file extension
  if (name.endsWith('.pdf')) return 'PDF Document';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'Word Document';
  
  return 'General Document';
}

/**
 * Extract key phrases from document text
 */
export function extractKeyPhrases(text: string): string[] {
  const phrases: string[] = [];
  const content = text.toLowerCase();
  
  // Compliance-related phrases
  if (content.includes('compliant') || content.includes('compliance')) phrases.push('Compliance');
  if (content.includes('requires attention') || content.includes('action required')) phrases.push('Action Required');
  if (content.includes('satisfactory') || content.includes('pass')) phrases.push('Satisfactory');
  if (content.includes('unsatisfactory') || content.includes('fail')) phrases.push('Unsatisfactory');
  
  // Safety-related phrases
  if (content.includes('safety') || content.includes('risk')) phrases.push('Safety/Risk');
  if (content.includes('emergency') || content.includes('evacuation')) phrases.push('Emergency');
  if (content.includes('fire') || content.includes('smoke')) phrases.push('Fire Safety');
  
  // Financial phrases
  if (content.includes('cost') || content.includes('£') || content.includes('payment')) phrases.push('Financial');
  if (content.includes('budget') || content.includes('estimate')) phrases.push('Budget/Estimate');
  
  // Legal phrases
  if (content.includes('legal') || content.includes('regulation') || content.includes('act')) phrases.push('Legal/Regulatory');
  if (content.includes('duty') || content.includes('responsibility')) phrases.push('Duty/Responsibility');
  
  return [...new Set(phrases)]; // Remove duplicates
}

/**
 * Generate basic summary based on document type and content
 */
export function generateBasicSummary(text: string, documentType: string): string {
  const content = text.toLowerCase();
  
  // Document type-specific summaries
  switch (documentType) {
    case 'Asbestos Survey':
      if (content.includes('no asbestos') || content.includes('no acm')) {
        return 'No asbestos-containing materials detected. Building is currently asbestos-clear.';
      } else if (content.includes('asbestos found') || content.includes('acm')) {
        return 'Asbestos-containing materials identified. Management plan required.';
      }
      break;
      
    case 'EICR':
      if (content.includes('c1') || content.includes('danger present')) {
        return 'Urgent electrical safety issues identified. Immediate action required.';
      } else if (content.includes('c2') || content.includes('potentially dangerous')) {
        return 'Electrical safety issues found. Remedial work required.';
      } else if (content.includes('c3') || content.includes('improvement recommended')) {
        return 'Electrical installation satisfactory with minor improvements recommended.';
      }
      break;
      
    case 'Fire Risk Assessment':
      if (content.includes('high risk') || content.includes('significant findings')) {
        return 'Fire safety risks identified. Action plan required.';
      } else if (content.includes('low risk') || content.includes('satisfactory')) {
        return 'Fire safety assessment satisfactory. Regular review recommended.';
      }
      break;
      
    case 'Lease Agreement':
      return 'Lease agreement document. Review terms and conditions carefully.';
      
    case 'Insurance Certificate':
      return 'Insurance certificate. Verify coverage and expiry dates.';
      
    case 'Major Works Scope':
      return 'Major works scope document. Review specifications and costs.';
      
    case 'Minutes/AGM':
      return 'Meeting minutes or AGM document. Review decisions and actions.';
  }
  
  // Generic summary based on content length
  if (text.length > 1000) {
    return 'Comprehensive document with substantial content. Review for key findings and requirements.';
  } else if (text.length > 100) {
    return 'Document with moderate content. Review for important information.';
  } else {
    return 'Document with limited text content. Consider re-uploading with OCR if scanned.';
  }
}

/**
 * Validate if extracted text is sufficient for AI analysis
 */
export function isTextSufficientForAnalysis(text: string): boolean {
  return text.trim().length >= 50;
}

/**
 * Clean and normalize extracted text
 */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s*\n/g, '\n') // Remove excessive line breaks
    .trim();
}
