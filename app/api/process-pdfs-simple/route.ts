// Simple PDF Processing Test Service
// Test with the specific document we found

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = "nodejs";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Testing PDF processing with specific document...');

    const pdfParse = (await import('pdf-parse')).default;
    const supabase = createServiceClient();

    // Get the specific document
    const { data: doc, error: fetchError } = await supabase
      .from('building_documents')
      .select('*')
      .eq('id', 'c23724b4-f64c-4fdc-9b2f-1cc56170cfc1')
      .single();

    if (fetchError || !doc) {
      console.error('❌ Error fetching document:', fetchError);
      return NextResponse.json({
        error: 'Document not found',
        details: fetchError?.message
      }, { status: 404, headers: CORS_HEADERS });
    }

    console.log(`🔄 Processing: ${doc.name}`);
    console.log(`📂 File path: ${doc.file_path}`);
    console.log(`🪣 Bucket: building_documents`);

    try {
      // Try to download the PDF
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from('building_documents')
        .download(doc.file_path);

      if (downloadError) {
        console.error('❌ Download error:', downloadError);
        return NextResponse.json({
          error: 'Failed to download PDF',
          details: downloadError.message,
          file_path: doc.file_path
        }, { status: 500, headers: CORS_HEADERS });
      }

      if (!pdfData) {
        return NextResponse.json({
          error: 'No PDF data received',
          file_path: doc.file_path
        }, { status: 500, headers: CORS_HEADERS });
      }

      console.log(`📥 Downloaded PDF, size: ${pdfData.size} bytes`);

      // Extract text from PDF
      const arrayBuffer = await pdfData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log('📖 Extracting text from PDF...');
      const pdfResult = await pdfParse(buffer);
      const extractedText = pdfResult.text;

      console.log(`📝 Extracted ${extractedText.length} characters from PDF`);
      console.log(`📄 PDF has ${pdfResult.numpages} pages`);

      // Clean text
      const cleanedText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s.,!?;:-]/g, '')
        .trim();

      // Create comprehensive searchable content combining PDF text + AI metadata
      const aiMetadata = doc.metadata?.ai_extracted;
      let comprehensiveContent = cleanedText;

      if (aiMetadata) {
        console.log('📋 Combining with existing AI-extracted metadata...');

        // Add AI-extracted content to make it searchable
        const metadataText = [
          aiMetadata.summary,
          aiMetadata.key_findings?.map(f => `${f.location}: ${f.observation} - ${f.action_required}`).join(' '),
          aiMetadata.recommendations?.map(r => `${r.action}: ${r.reason}`).join(' '),
          aiMetadata.document_type,
          aiMetadata.compliance_status,
          aiMetadata.risk_assessment?.overall_risk,
          aiMetadata.regulatory_compliance?.relevant_regulations?.join(' ')
        ].filter(Boolean).join(' ');

        comprehensiveContent = `${cleanedText} ${metadataText}`;
      }

      console.log(`📚 Total searchable content: ${comprehensiveContent.length} characters`);

      // Update database
      const { error: updateError } = await supabase
        .from('building_documents')
        .update({
          ocr_text: comprehensiveContent,
          metadata: {
            ...doc.metadata,
            text_extraction: {
              processed_at: new Date().toISOString(),
              pdf_text_length: cleanedText.length,
              total_searchable_length: comprehensiveContent.length,
              pages: pdfResult.numpages,
              method: 'pdf-parse + ai-metadata',
              includes_ai_metadata: !!aiMetadata
            }
          }
        })
        .eq('id', doc.id);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        return NextResponse.json({
          error: 'Failed to update database',
          details: updateError.message
        }, { status: 500, headers: CORS_HEADERS });
      }

      console.log('✅ Successfully processed and stored document');

      return NextResponse.json({
        success: true,
        document_name: doc.name,
        pdf_text_length: cleanedText.length,
        total_searchable_length: comprehensiveContent.length,
        pages: pdfResult.numpages,
        includes_ai_metadata: !!aiMetadata,
        preview: comprehensiveContent.substring(0, 200) + '...'
      }, { headers: CORS_HEADERS });

    } catch (pdfError) {
      console.error('❌ PDF processing error:', pdfError);
      return NextResponse.json({
        error: 'PDF processing failed',
        details: pdfError instanceof Error ? pdfError.message : 'Unknown error'
      }, { status: 500, headers: CORS_HEADERS });
    }

  } catch (error) {
    console.error('❌ Service error:', error);
    return NextResponse.json({
      error: 'Service failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: CORS_HEADERS });
  }
}