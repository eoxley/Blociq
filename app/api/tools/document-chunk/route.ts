// Document Chunking Endpoint
// Splits documents into searchable chunks and generates embeddings

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getOpenAIClient } from '@/lib/openai-client';


export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    console.log('🔪 Chunking document:', documentId);

    // Log processing start
    const supabase = createRouteHandlerClient({ cookies });
    await supabase
      .from('document_processing_status')
      .insert({
        document_id: documentId,
        status: 'processing',
        processing_type: 'chunking',
        metadata: { start_time: new Date().toISOString() }
      });

    // Get document content
    const { data: document, error: docError } = await supabase
      .from('building_documents')
      .select('text_content, type, file_name')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found or error fetching document');
    }

    if (!document.text_content) {
      throw new Error('Document has no text content to chunk');
    }

    console.log('📄 Document content length:', document.text_content.length);

    // Split into chunks (500-1000 words each, approximately 750 words)
    const chunks = splitIntoChunks(document.text_content, 750);
    console.log('🔪 Created', chunks.length, 'chunks');

    // Generate embeddings for each chunk
    const chunkPromises = chunks.map(async (chunk, index) => {
      try {
        const embedding = await generateEmbedding(chunk);
        
        return {
          document_id: documentId,
          chunk_index: index,
          content: chunk,
          embedding,
          metadata: { 
            type: document.type, 
            chunk_size: chunk.length,
            chunk_number: index + 1,
            total_chunks: chunks.length
          }
        };
      } catch (embeddingError) {
        console.error(`Failed to generate embedding for chunk ${index}:`, embeddingError);
        // Return chunk without embedding for now
        return {
          document_id: documentId,
          chunk_index: index,
          content: chunk,
          embedding: null, // Will be null if embedding fails
          metadata: { 
            type: document.type, 
            chunk_size: chunk.length,
            chunk_number: index + 1,
            total_chunks: chunks.length,
            embedding_failed: true
          }
        };
      }
    });

    const chunkData = await Promise.all(chunkPromises);
    console.log('🧠 Generated embeddings for', chunkData.filter(c => c.embedding).length, 'chunks');

    // Insert chunks into database
    const { error: insertError } = await supabase
      .from('document_chunks')
      .insert(chunkData);

    if (insertError) {
      console.error('Failed to insert chunks:', insertError);
      throw new Error('Failed to insert document chunks');
    }

    // Log successful processing
    await supabase
      .from('document_processing_status')
      .update({
        status: 'completed',
        metadata: { 
          chunks_created: chunks.length,
          chunks_with_embeddings: chunkData.filter(c => c.embedding).length,
          total_text_length: document.text_content.length,
          average_chunk_size: Math.round(document.text_content.length / chunks.length),
          success: true
        }
      })
      .eq('document_id', documentId)
      .eq('processing_type', 'chunking');

    console.log('✅ Document chunking completed:', chunks.length, 'chunks created');

    return NextResponse.json({ 
      success: true, 
      chunksCreated: chunks.length,
      chunksWithEmbeddings: chunkData.filter(c => c.embedding).length,
      totalTextLength: document.text_content.length,
      averageChunkSize: Math.round(document.text_content.length / chunks.length)
    });

  } catch (error) {
    console.error('❌ Document chunking error:', error);
    
    // Log failed processing
    try {
      const supabase = createRouteHandlerClient({ cookies });
      await supabase
        .from('document_processing_status')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Chunking failed',
          metadata: { 
            error: true,
            error_type: 'chunking_failure'
          }
        })
        .eq('document_id', documentId || 'unknown')
        .eq('processing_type', 'chunking');
    } catch (logError) {
      console.error('Failed to log error status:', logError);
    }
    
    return NextResponse.json({ 
      error: 'Chunking failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to split text into chunks
function splitIntoChunks(text: string, targetWords: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  let currentChunk: string[] = [];
  let currentWordCount = 0;
  
  for (const word of words) {
    currentChunk.push(word);
    currentWordCount++;
    
    // Create chunk when we reach target word count or hit natural break
    if (currentWordCount >= targetWords || 
        (word.endsWith('.') || word.endsWith('!') || word.endsWith('?'))) {
      
      const chunkText = currentChunk.join(' ').trim();
      if (chunkText.length > 50) { // Only add chunks with meaningful content
        chunks.push(chunkText);
      }
      
      currentChunk = [];
      currentWordCount = 0;
    }
  }
  
  // Add remaining words as final chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ').trim();
    if (chunkText.length > 50) {
      chunks.push(chunkText);
    }
  }
  
  return chunks;
}

// Helper function to generate OpenAI embeddings
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding generation failed:', error);
    throw new Error('Failed to generate embedding');
  }
}
