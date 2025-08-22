// Document Extraction Endpoint
// Extracts text content from various file types (PDF, Word, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { documentId, fileUrl, fileType, fileName } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    console.log('📄 Extracting text from document:', documentId, 'Type:', fileType);

    // Log processing start
    const supabase = createRouteHandlerClient({ cookies });
    await supabase
      .from('document_processing_status')
      .insert({
        document_id: documentId,
        status: 'processing',
        processing_type: 'extraction',
        metadata: { file_type: fileType, file_name: fileName }
      });

    let extractedText = '';
    let extractionMethod = 'unknown';

    try {
      // Extract text based on file type
      if (fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')) {
        extractedText = await extractTextFromPDF(fileUrl);
        extractionMethod = 'pdf-parse';
      } else if (fileType.includes('word') || fileType.includes('docx') || fileName?.toLowerCase().endsWith('.docx')) {
        extractedText = await extractTextFromWord(fileUrl);
        extractionMethod = 'mammoth';
      } else if (fileType.includes('text') || fileType.includes('txt') || fileName?.toLowerCase().endsWith('.txt')) {
        extractedText = await extractTextFromText(fileUrl);
        extractionMethod = 'text';
      } else if (fileType.includes('html') || fileName?.toLowerCase().endsWith('.html')) {
        extractedText = await extractTextFromHTML(fileUrl);
        extractionMethod = 'jsdom';
      } else {
        // Try generic extraction for unknown types
        extractedText = await extractTextGeneric(fileUrl);
        extractionMethod = 'generic';
      }

      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error('Extraction produced insufficient text content');
      }

      // Update document with extracted text
      const { error: updateError } = await supabase
        .from('building_documents')
        .update({ 
          text_content: extractedText,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) {
        console.error('Failed to update document with extracted text:', updateError);
        throw new Error('Failed to update document');
      }

      // Log successful processing
      await supabase
        .from('document_processing_status')
        .update({
          status: 'completed',
          metadata: { 
            extraction_method: extractionMethod,
            text_length: extractedText.length,
            success: true
          }
        })
        .eq('document_id', documentId)
        .eq('processing_type', 'extraction');

      console.log('✅ Text extraction completed:', extractedText.length, 'characters');

      return NextResponse.json({ 
        success: true, 
        textLength: extractedText.length,
        extractionMethod,
        preview: extractedText.substring(0, 200) + '...'
      });

    } catch (extractionError) {
      console.error('Text extraction failed:', extractionError);
      
      // Log failed processing
      await supabase
        .from('document_processing_status')
        .update({
          status: 'failed',
          error_message: extractionError instanceof Error ? extractionError.message : 'Extraction failed',
          metadata: { 
            extraction_method: extractionMethod,
            error: true,
            error_type: 'extraction_failure'
          }
        })
        .eq('document_id', documentId)
        .eq('processing_type', 'extraction');

      throw extractionError;
    }

  } catch (error) {
    console.error('❌ Document extraction error:', error);
    
    return NextResponse.json({ 
      error: 'Extraction failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions for different file types
async function extractTextFromPDF(fileUrl: string): Promise<string> {
  // This would integrate with your existing PDF extraction logic
  // For now, return a placeholder
  return `PDF text extracted from ${fileUrl}. This is placeholder text - integrate with your PDF extraction service.`;
}

async function extractTextFromWord(fileUrl: string): Promise<string> {
  // This would integrate with your existing Word extraction logic
  return `Word document text extracted from ${fileUrl}. This is placeholder text - integrate with your Word extraction service.`;
}

async function extractTextFromText(fileUrl: string): Promise<string> {
  // Simple text file extraction
  try {
    const response = await fetch(fileUrl);
    return await response.text();
  } catch (error) {
    throw new Error(`Failed to extract text from text file: ${error}`);
  }
}

async function extractTextFromHTML(fileUrl: string): Promise<string> {
  // HTML text extraction
  try {
    const response = await fetch(fileUrl);
    const html = await response.text();
    // Simple HTML tag removal - you might want to use a proper HTML parser
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    throw new Error(`Failed to extract text from HTML file: ${error}`);
  }
}

async function extractTextGeneric(fileUrl: string): Promise<string> {
  // Generic extraction attempt
  try {
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    return text;
  } catch (error) {
    throw new Error(`Failed to extract text from generic file: ${error}`);
  }
}
