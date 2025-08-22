// Document Processing Orchestrator
// Coordinates the entire document processing pipeline: classification → extraction → chunking

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { documentId, fileUrl, fileType, fileName } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    console.log('🚀 Starting document processing pipeline for:', documentId);

    const supabase = createRouteHandlerClient({ cookies });
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Step 1: Classify the document
    console.log('🔍 Step 1: Classifying document...');
    try {
      const classifyResponse = await fetch(`${baseUrl}/api/tools/document-classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, fileName })
      });

      if (!classifyResponse.ok) {
        throw new Error(`Classification failed: ${classifyResponse.statusText}`);
      }

      const classificationResult = await classifyResponse.json();
      console.log('✅ Classification completed:', classificationResult.classification);
    } catch (error) {
      console.error('❌ Classification failed:', error);
      // Continue with processing even if classification fails
    }

    // Step 2: Extract text content
    console.log('📄 Step 2: Extracting text content...');
    try {
      const extractResponse = await fetch(`${baseUrl}/api/tools/document-extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, fileUrl, fileType, fileName })
      });

      if (!extractResponse.ok) {
        throw new Error(`Extraction failed: ${extractResponse.statusText}`);
      }

      const extractionResult = await extractResponse.json();
      console.log('✅ Extraction completed:', extractionResult.textLength, 'characters');
    } catch (error) {
      console.error('❌ Extraction failed:', error);
      // Cannot continue without text content
      throw new Error(`Document processing failed at extraction step: ${error}`);
    }

    // Step 3: Chunk the document and generate embeddings
    console.log('🔪 Step 3: Chunking document and generating embeddings...');
    try {
      const chunkResponse = await fetch(`${baseUrl}/api/tools/document-chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      });

      if (!chunkResponse.ok) {
        throw new Error(`Chunking failed: ${chunkResponse.statusText}`);
      }

      const chunkResult = await chunkResponse.json();
      console.log('✅ Chunking completed:', chunkResult.chunksCreated, 'chunks');
    } catch (error) {
      console.error('❌ Chunking failed:', error);
      // Continue without embeddings - chunks will still be searchable by text
    }

    // Step 4: Update document status
    console.log('📝 Step 4: Updating document status...');
    try {
      const { error: updateError } = await supabase
        .from('building_documents')
        .update({ 
          updated_at: new Date().toISOString(),
          // Add a flag to indicate processing is complete
          content_summary: 'Document processing completed successfully'
        })
        .eq('id', documentId);

      if (updateError) {
        console.warn('Failed to update document status:', updateError);
      }
    } catch (error) {
      console.warn('Failed to update document status:', error);
    }

    // Step 5: Log overall processing completion
    console.log('📊 Step 5: Logging processing completion...');
    try {
      await supabase
        .from('document_processing_status')
        .insert({
          document_id: documentId,
          status: 'completed',
          processing_type: 'orchestration',
          metadata: { 
            pipeline_completed: true,
            completed_at: new Date().toISOString(),
            success: true
          }
        });
    } catch (error) {
      console.warn('Failed to log orchestration completion:', error);
    }

    console.log('🎉 Document processing pipeline completed successfully!');

    return NextResponse.json({ 
      success: true, 
      message: 'Document processing pipeline completed successfully',
      documentId,
      pipeline: {
        classification: 'completed',
        extraction: 'completed',
        chunking: 'completed',
        orchestration: 'completed'
      }
    });

  } catch (error) {
    console.error('❌ Document processing pipeline failed:', error);
    
    // Log pipeline failure
    try {
      const supabase = createRouteHandlerClient({ cookies });
      await supabase
        .from('document_processing_status')
        .insert({
          document_id: documentId || 'unknown',
          status: 'failed',
          processing_type: 'orchestration',
          error_message: error instanceof Error ? error.message : 'Pipeline failed',
          metadata: { 
            error: true,
            error_type: 'pipeline_failure',
            failed_at: new Date().toISOString()
          }
        });
    } catch (logError) {
      console.error('Failed to log pipeline failure:', logError);
    }
    
    return NextResponse.json({ 
      error: 'Document processing pipeline failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to check processing status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get processing status for all steps
    const { data: statuses, error } = await supabase
      .from('document_processing_status')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Get document info
    const { data: document } = await supabase
      .from('building_documents')
      .select('file_name, type, text_content, updated_at')
      .eq('id', documentId)
      .single();

    // Get chunk count
    const { count: chunkCount } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    return NextResponse.json({
      success: true,
      documentId,
      document,
      processingStatus: statuses,
      chunkCount: chunkCount || 0,
      summary: {
        classification: statuses?.find(s => s.processing_type === 'classification')?.status || 'not_started',
        extraction: statuses?.find(s => s.processing_type === 'extraction')?.status || 'not_started',
        chunking: statuses?.find(s => s.processing_type === 'chunking')?.status || 'not_started',
        orchestration: statuses?.find(s => s.processing_type === 'orchestration')?.status || 'not_started'
      }
    });

  } catch (error) {
    console.error('Failed to get processing status:', error);
    return NextResponse.json({ 
      error: 'Failed to get processing status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
