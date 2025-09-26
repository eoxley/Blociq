// PDF Processing Service
// This endpoint extracts text from PDFs in Supabase Storage and populates the ocr_text field
// for enhanced industry knowledge search capabilities

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = "nodejs";

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS
  });
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Starting PDF processing for industry knowledge extraction...');

    // Dynamic import to prevent build-time execution
    const pdfParse = (await import('pdf-parse')).default;

    const supabase = createServiceClient();

    // Get all documents that haven't been processed yet
    const { data: documents, error: fetchError } = await supabase
      .from('building_documents')
      .select('*')
      .is('ocr_text', null)
      .ilike('name', '%.pdf');

    if (fetchError) {
      console.error('❌ Error fetching documents:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch documents',
        details: fetchError.message
      }, { status: 500, headers: CORS_HEADERS });
    }

    if (!documents || documents.length === 0) {
      console.log('✅ No unprocessed PDF documents found');
      return NextResponse.json({
        message: 'No PDFs need processing',
        processed: 0
      }, { headers: CORS_HEADERS });
    }

    console.log(`📄 Found ${documents.length} PDF documents to process`);

    const results = [];

    for (const document of documents) {
      try {
        console.log(`🔄 Processing: ${document.name}`);

        // Download PDF from Supabase Storage
        const { data: pdfData, error: downloadError } = await supabase.storage
          .from('building_documents')
          .download(document.file_path);

        if (downloadError) {
          console.error(`❌ Failed to download ${document.name}:`, downloadError);
          results.push({
            id: document.id,
            name: document.name,
            status: 'failed',
            error: downloadError.message
          });
          continue;
        }

        if (!pdfData) {
          console.error(`❌ No data received for ${document.name}`);
          results.push({
            id: document.id,
            name: document.name,
            status: 'failed',
            error: 'No PDF data received'
          });
          continue;
        }

        // Convert blob to buffer
        const arrayBuffer = await pdfData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract text from PDF
        console.log(`📖 Extracting text from ${document.name}...`);
        const pdfData_parsed = await pdfParse(buffer);
        const extractedText = pdfData_parsed.text;

        if (!extractedText || extractedText.trim().length === 0) {
          console.warn(`⚠️ No text extracted from ${document.name}`);
          results.push({
            id: document.id,
            name: document.name,
            status: 'no_text',
            error: 'No readable text found in PDF'
          });
          continue;
        }

        // Clean and prepare text for storage
        const cleanedText = extractedText
          .replace(/\s+/g, ' ')           // Normalize whitespace
          .replace(/[^\w\s.,!?;:-]/g, '') // Remove special characters
          .trim();

        console.log(`📝 Extracted ${cleanedText.length} characters from ${document.name}`);

        // Update database with extracted text
        const { error: updateError } = await supabase
          .from('building_documents')
          .update({
            ocr_text: cleanedText,
            metadata: {
              ...document.metadata,
              text_extraction: {
                processed_at: new Date().toISOString(),
                text_length: cleanedText.length,
                pages: pdfData_parsed.numpages,
                method: 'pdf-parse'
              }
            }
          })
          .eq('id', document.id);

        if (updateError) {
          console.error(`❌ Failed to update database for ${document.name}:`, updateError);
          results.push({
            id: document.id,
            name: document.name,
            status: 'failed',
            error: updateError.message
          });
          continue;
        }

        console.log(`✅ Successfully processed ${document.name}`);
        results.push({
          id: document.id,
          name: document.name,
          status: 'success',
          text_length: cleanedText.length,
          pages: pdfData_parsed.numpages
        });

      } catch (error) {
        console.error(`❌ Error processing ${document.name}:`, error);
        results.push({
          id: document.id,
          name: document.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`✅ PDF processing complete: ${successCount} successful, ${failedCount} failed`);

    return NextResponse.json({
      message: 'PDF processing complete',
      processed: successCount,
      failed: failedCount,
      total: documents.length,
      results: results
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('❌ PDF processing service error:', error);
    return NextResponse.json({
      error: 'PDF processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Get processing status
    const { data: allDocs, error: allError } = await supabase
      .from('building_documents')
      .select('id, name, ocr_text, metadata')
      .ilike('name', '%.pdf');

    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500, headers: CORS_HEADERS });
    }

    const total = allDocs?.length || 0;
    const processed = allDocs?.filter(doc => doc.ocr_text && doc.ocr_text.trim().length > 0).length || 0;
    const pending = total - processed;

    const lastProcessed = allDocs?.find(doc =>
      doc.metadata?.text_extraction?.processed_at
    )?.metadata?.text_extraction?.processed_at || null;

    return NextResponse.json({
      status: 'ready',
      total_pdfs: total,
      processed: processed,
      pending: pending,
      last_processed: lastProcessed
    }, { headers: CORS_HEADERS });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get processing status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: CORS_HEADERS });
  }
}