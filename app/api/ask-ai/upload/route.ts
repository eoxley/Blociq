import { NextRequest, NextResponse } from 'next/server';
import { extractText } from '@/lib/extract-text';

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutes for document upload and OCR

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Ask AI Upload: Processing document upload for OCR...');

    // Get file from request
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided',
        textLength: 0,
        extractedText: '',
        filename: '',
        documentType: 'document',
        summary: 'No file provided for processing',
        analysis: 'Please select a file to upload'
      }, { status: 400 });
    }

    // Validate file has non-zero content
    if (!file.size || file.size === 0) {
      console.warn('❌ Received file with zero size:', file.name);
      return NextResponse.json({
        success: false,
        error: 'File is empty or corrupted',
        textLength: 0,
        extractedText: '',
        filename: file.name,
        documentType: 'document',
        summary: 'Empty file provided',
        analysis: 'The uploaded file appears to be empty or corrupted. Please check the file and try again.'
      }, { status: 400 });
    }

    // Additional buffer validation - convert to buffer and check content
    let fileBuffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.warn('❌ File ArrayBuffer is empty:', file.name);
        return NextResponse.json({
          success: false,
          error: 'File buffer is empty',
          textLength: 0,
          extractedText: '',
          filename: file.name,
          documentType: 'document',
          summary: 'Empty file buffer',
          analysis: 'The file content could not be read or is empty. Please verify the file is not corrupted.'
        }, { status: 400 });
      }
      
      fileBuffer = Buffer.from(arrayBuffer);
      console.log('✅ File buffer validation passed:', {
        bufferSize: fileBuffer.length,
        expectedSize: file.size,
        matches: fileBuffer.length === file.size
      });
      
    } catch (bufferError) {
      console.error('❌ Failed to read file buffer:', bufferError);
      return NextResponse.json({
        success: false,
        error: 'Failed to read file content',
        textLength: 0,
        extractedText: '',
        filename: file.name,
        documentType: 'document',
        summary: 'File read error',
        analysis: 'Unable to read the file content. The file may be corrupted or in an unsupported format.'
      }, { status: 400 });
    }

    console.log('📁 File info:', {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    });

    // Check file size limits - Vercel serverless functions have 4.5MB payload limit
    const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB limit for Vercel compatibility
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `File too large for serverless OCR processing (max ${(MAX_FILE_SIZE / (1024 * 1024))}MB)`,
        textLength: 0,
        extractedText: '',
        filename: file.name,
        documentType: 'document',
        summary: 'File too large for processing',
        analysis: `The file ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum size limit of ${(MAX_FILE_SIZE / (1024 * 1024))}MB for serverless processing. This is due to Vercel's 4.5MB payload limit. Please compress the PDF or split it into smaller files.`,
        metadata: {
          fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
          maxSizeMB: (MAX_FILE_SIZE / (1024 * 1024)).toFixed(2),
          reason: 'VERCEL_PAYLOAD_LIMIT',
          recommendations: [
            'Compress the PDF using online tools',
            'Split large documents into smaller sections',
            'Use image formats (PNG/JPG) instead of high-resolution PDFs'
          ]
        }
      }, { status: 413 });
    }

    // Use the comprehensive text extraction system
    console.log('🔍 Starting comprehensive text extraction...');
    const extractionResult = await extractText(file);
    
    const { extractedText, textLength, source, confidence, metadata: extractionMetadata } = extractionResult;
    
    // Determine success based on extraction results
    const success = source !== 'failed' && textLength > 0;
    
    console.log(`📊 Extraction complete: ${textLength} characters via ${source}`);
    
    // Generate analysis and summary based on extraction success
    let analysis: string;
    let summary: string;
    
    if (success && source !== 'test_mode') {
      analysis = `Successfully extracted ${textLength} characters from ${file.name} using ${source}. ${
        file.type === 'application/pdf' ? 'This PDF document' : 'This document'
      } contains structured text with key information that can be analyzed. ${
        confidence ? `OCR confidence: ${Math.round(confidence * 100)}%` : ''
      }`;
      
      summary = `Document processed: ${textLength} characters extracted via ${source}. Ready for AI analysis and questioning.`;
    } else if (source === 'test_mode') {
      // Test mode should no longer be used
      analysis = `OCR extraction failed for ${file.name}. All available OCR methods (OpenAI Vision, Google Vision, PDF.js, Tesseract) were attempted but could not extract text from this document.`;
      
      summary = `Document processing failed. All OCR methods failed to extract text from this document.`;
    } else {
      analysis = `Unable to extract text from ${file.name}. ${extractionMetadata?.errorDetails || 'The file may be corrupted, encrypted, or in an unsupported format.'} All OCR methods failed.`;
      
      summary = 'Document processing failed. No text could be extracted from this file.';
    }

    // Detect document type based on content (for PDFs and legal documents)
    let documentType = 'document';
    if (extractedText.toLowerCase().includes('lease') || extractedText.toLowerCase().includes('tenancy')) {
      documentType = 'lease_agreement';
    } else if (extractedText.toLowerCase().includes('invoice') || extractedText.toLowerCase().includes('bill')) {
      documentType = 'invoice';
    } else if (extractedText.toLowerCase().includes('contract') || extractedText.toLowerCase().includes('agreement')) {
      documentType = 'contract';
    }

    // Return comprehensive response format
    return NextResponse.json({
      success,
      documentType,
      summary,
      analysis,
      filename: file.name,
      textLength,
      extractedText,
      ocrSource: source,
      confidence: confidence || undefined,
      metadata: {
        fileType: file.type,
        fileSize: file.size,
        fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
        extractedLength: textLength,
        timestamp: new Date().toISOString(),
        ocrMethod: source,
        processingTime: extractionMetadata?.processingTime || undefined,
        pageCount: extractionMetadata?.pageCount || undefined,
        errorDetails: extractionMetadata?.errorDetails || undefined,
        availableMethods: [
          file.type === 'application/pdf' ? 'PDF.js (text-based PDFs)' : 'PDF.js (not applicable)',
          process.env.OPENAI_API_KEY ? 'OpenAI Vision (configured)' : 'OpenAI Vision (not configured)', 
          'Google Vision (attempted)',
          file.size < 10 * 1024 * 1024 ? 'Tesseract (available)' : 'Tesseract (file too large)',
          'Test mode (always available)'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Ask AI Upload error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process document upload',
      details: error instanceof Error ? error.message : 'Unknown error',
      textLength: 0,
      extractedText: '',
      documentType: 'document',
      summary: 'Document processing failed due to an internal error.',
      analysis: 'An error occurred while processing the uploaded document. Please try again.',
      filename: 'unknown'
    }, { status: 500 });
  }
}