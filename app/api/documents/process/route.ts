import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { extractTextFromFile } from '@/lib/ai/ocr';
import { retrieveContext } from '@/lib/ai/retrieve';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProcessDocumentRequest {
  file_url: string;
  building_id?: string;
  unit_id?: string;
  leaseholder_id?: string;
}

interface ProcessDocumentResponse {
  document_id: string;
  file_name: string;
  full_text: string;
  content_summary: string;
  type: string;
  confidence: number;
  suggested_action: string;
  extracted: any;
  auto_linked_building_id?: string;
  is_unlinked: boolean;
  ocr_used: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ProcessDocumentRequest = await request.json();
    const { file_url, building_id, unit_id, leaseholder_id } = body;

    // Get user from auth
    const cookieStore = await cookies();
    const supabaseAuth = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabaseAuth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!file_url) {
      return NextResponse.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Extract file name from URL
    const fileName = file_url.split('/').pop() || 'unknown_file';
    
    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(file_url);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    
    // Extract text from file
    const { text: fullText, ocr_used } = await extractTextFromFile(fileBuffer, fileData.type);

    // Call /api/ask-blociq with ingest mode
    const ingestResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || 'http://localhost:3000'}/api/ask-blociq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        mode: 'ingest',
        message: 'Analyse this document for classification, key dates, and actions.',
        file_text: fullText,
        building_id,
        unit_id,
        leaseholder_id
      })
    });

    if (!ingestResponse.ok) {
      console.error('Error calling ingest mode:', await ingestResponse.text());
      return NextResponse.json({ error: 'Failed to analyse document' }, { status: 500 });
    }

    const ingestData = await ingestResponse.json();

    // Determine auto-linked building ID based on confidence
    const autoLinkedBuildingId = ingestData.confidence && ingestData.confidence > 0.8 
      ? (ingestData.guesses?.building_id || building_id)
      : undefined;

    // Prepare document data
    const documentData = {
      file_name: fileName,
      file_url,
      full_text: fullText,
      content_summary: ingestData.answer || '',
      type: ingestData.classification || 'unknown',
      confidence: ingestData.confidence || 0,
      suggested_action: ingestData.proposed_actions?.[0]?.type || '',
      extracted: {
        guesses: ingestData.guesses || {},
        extracted_fields: ingestData.extracted_fields || {},
        suggested_actions: ingestData.proposed_actions || []
      },
      auto_linked_building_id: autoLinkedBuildingId,
      is_unlinked: true,
      ocr_used
    };

    // Save/Upsert building_documents
    const { data: savedDocument, error: saveError } = await supabase
      .from('building_documents')
      .upsert({
        ...documentData,
        building_id: building_id || autoLinkedBuildingId,
        unit_id,
        leaseholder_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving document:', saveError);
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }

    // Chunk and embed the document
    if (fullText && savedDocument) {
      try {
        // Create chunks (simple approach - split by paragraphs)
        const paragraphs = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 50);
        const chunks = paragraphs.map((content, index) => ({
          document_id: savedDocument.id,
          building_id: building_id || autoLinkedBuildingId,
          content: content.trim(),
          chunk_index: index,
          created_at: new Date().toISOString()
        }));

        // Insert chunks
        if (chunks.length > 0) {
          const { error: chunkError } = await supabase
            .from('doc_chunks')
            .insert(chunks);

          if (chunkError) {
            console.error('Error creating chunks:', chunkError);
          }
        }
      } catch (error) {
        console.error('Error chunking document:', error);
      }
    }

    const response: ProcessDocumentResponse = {
      document_id: savedDocument.id,
      file_name: savedDocument.file_name,
      full_text: savedDocument.full_text,
      content_summary: savedDocument.content_summary,
      type: savedDocument.type,
      confidence: savedDocument.confidence,
      suggested_action: savedDocument.suggested_action,
      extracted: savedDocument.extracted,
      auto_linked_building_id: savedDocument.auto_linked_building_id,
      is_unlinked: savedDocument.is_unlinked,
      ocr_used: savedDocument.ocr_used
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in document process route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 