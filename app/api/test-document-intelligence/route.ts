// Test Document Intelligence System
// Endpoint to test and verify the document processing pipeline

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const testMode = searchParams.get('testMode') === 'true';

    console.log('🧪 Testing document intelligence system...');

    const supabase = createRouteHandlerClient({ cookies });

    // Test 1: Check if document_chunks table exists and has data
    console.log('📊 Test 1: Checking document_chunks table...');
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('*')
      .limit(5);

    if (chunksError) {
      console.error('❌ document_chunks table error:', chunksError);
      return NextResponse.json({ 
        error: 'document_chunks table not accessible',
        details: chunksError.message
      }, { status: 500 });
    }

    // Test 2: Check if document_processing_status table exists
    console.log('📊 Test 2: Checking document_processing_status table...');
    const { data: processingStatus, error: statusError } = await supabase
      .from('document_processing_status')
      .select('*')
      .limit(5);

    if (statusError) {
      console.error('❌ document_processing_status table error:', statusError);
      return NextResponse.json({ 
        error: 'document_processing_status table not accessible',
        details: statusError.message
      }, { status: 500 });
    }

    // Test 3: Check building documents
    console.log('📊 Test 3: Checking building_documents table...');
    let buildingDocs: any[] = [];
    if (buildingId) {
      const { data: docs, error: docsError } = await supabase
        .from('building_documents')
        .select('id, file_name, type, text_content, building_id')
        .eq('building_id', buildingId)
        .limit(10);
      
      if (!docsError) {
        buildingDocs = docs || [];
      }
    }

    // Test 4: Check vector search function (if chunks exist)
    console.log('📊 Test 4: Testing vector search function...');
    let vectorSearchTest = 'not_tested';
    if (chunks && chunks.length > 0) {
      try {
        // Test the match_documents function
        const { data: searchResults, error: searchError } = await supabase.rpc('match_documents', {
          query_embedding: new Array(1536).fill(0.1), // Dummy embedding for test
          match_threshold: 0.1,
          match_count: 3
        });
        
        if (!searchError) {
          vectorSearchTest = 'working';
        } else {
          vectorSearchTest = 'error: ' + searchError.message;
        }
      } catch (error) {
        vectorSearchTest = 'exception: ' + (error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Test 5: Check API endpoints (if testMode is true)
    const apiTests: any = {};
    if (testMode) {
      console.log('📊 Test 5: Testing API endpoints...');
      
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      
      // Test classification endpoint
      try {
        const classifyResponse = await fetch(`${baseUrl}/api/tools/document-classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            documentId: 'test-id', 
            fileName: 'test-document.pdf' 
          })
        });
        apiTests.classification = classifyResponse.status === 400 ? 'endpoint_exists' : 'unexpected_status';
      } catch (error) {
        apiTests.classification = 'error: ' + (error instanceof Error ? error.message : 'Unknown error');
      }

      // Test extraction endpoint
      try {
        const extractResponse = await fetch(`${baseUrl}/api/tools/document-extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            documentId: 'test-id', 
            fileUrl: 'https://example.com/test.pdf',
            fileType: 'application/pdf'
          })
        });
        apiTests.extraction = extractResponse.status === 400 ? 'endpoint_exists' : 'unexpected_status';
      } catch (error) {
        apiTests.extraction = 'error: ' + (error instanceof Error ? error.message : 'Unknown error');
      }

      // Test chunking endpoint
      try {
        const chunkResponse = await fetch(`${baseUrl}/api/tools/document-chunk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: 'test-id' })
        });
        apiTests.chunking = chunkResponse.status === 400 ? 'endpoint_exists' : 'unexpected_status';
      } catch (error) {
        apiTests.chunking = 'error: ' + (error instanceof Error ? error.message : 'Unknown error');
      }
    }

    console.log('✅ Document intelligence system test completed');

    return NextResponse.json({
      success: true,
      message: 'Document intelligence system test completed',
      timestamp: new Date().toISOString(),
      tests: {
        document_chunks_table: {
          accessible: true,
          record_count: chunks?.length || 0,
          sample_data: chunks?.slice(0, 2) || []
        },
        document_processing_status_table: {
          accessible: true,
          record_count: processingStatus?.length || 0,
          sample_data: processingStatus?.slice(0, 2) || []
        },
        building_documents: {
          accessible: true,
          record_count: buildingDocs.length,
          sample_data: buildingDocs.slice(0, 2)
        },
        vector_search_function: {
          status: vectorSearchTest,
          chunks_available: chunks && chunks.length > 0
        },
        api_endpoints: testMode ? apiTests : 'not_tested'
      },
      summary: {
        tables_accessible: true,
        chunks_available: chunks && chunks.length > 0,
        vector_search_working: vectorSearchTest === 'working',
        system_ready: chunks && chunks.length > 0 && vectorSearchTest === 'working'
      }
    });

  } catch (error) {
    console.error('❌ Document intelligence test failed:', error);
    
    return NextResponse.json({ 
      error: 'Document intelligence test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
