import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RetrievedChunk {
  id: string;
  document_id: string;
  building_id: string;
  content: string;
  score: number;
}

export async function retrieveContext({
  query,
  buildingId,
  limit = 8
}: {
  query: string;
  buildingId?: string;
  limit?: number;
}): Promise<RetrievedChunk[]> {
  try {
    // Create embedding using OpenAI text-embedding-3-small
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Call Supabase RPC search_doc_chunks
    const { data, error } = await supabase.rpc('search_doc_chunks', {
      q_embedding: embedding,
      q_text: query,
      q_building_id: buildingId || null,
      q_limit: limit
    });

    if (error) {
      console.error('Error calling search_doc_chunks RPC:', error);
      return [];
    }

    // Transform the response to match our interface
    return (data || []).map((item: any) => ({
      id: item.id,
      document_id: item.document_id,
      building_id: item.building_id,
      content: item.content,
      score: item.score || 0
    }));

  } catch (error) {
    console.error('Error in retrieveContext:', error);
    return [];
  }
}

export async function embedMissingChunks(limit = 500): Promise<number> {
  try {
    // Select chunks without embeddings
    const { data: chunks, error: selectError } = await supabase
      .from('doc_chunks')
      .select('id, content')
      .is('embedding', null)
      .limit(limit);

    if (selectError) {
      console.error('Error selecting chunks:', selectError);
      return 0;
    }

    if (!chunks || chunks.length === 0) {
      return 0;
    }

    // Batch embed with text-embedding-3-small
    const texts = chunks.map(chunk => chunk.content);
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    // Update embedding column for each row
    const updates = chunks.map((chunk, index) => ({
      id: chunk.id,
      embedding: embeddingResponse.data[index].embedding
    }));

    const { error: updateError } = await supabase
      .from('doc_chunks')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) {
      console.error('Error updating embeddings:', updateError);
      return 0;
    }

    return chunks.length;

  } catch (error) {
    console.error('Error in embedMissingChunks:', error);
    return 0;
  }
}
