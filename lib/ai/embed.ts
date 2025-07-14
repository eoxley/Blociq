import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// --- CONFIG ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const FOUNDER_KNOWLEDGE_TABLE = 'founder_knowledge';
const CHUNK_SIZE_TOKENS = 500;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- UTILS ---
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 chars in English
  return Math.ceil(text.length / 4);
}

function chunkText(text: string, maxTokens: number): string[] {
  const paragraphs = text.split(/\n{2,}/g);
  const chunks: string[] = [];
  let current = '';
  let currentTokens = 0;
  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    if (currentTokens + paraTokens > maxTokens && current) {
      chunks.push(current.trim());
      current = '';
      currentTokens = 0;
    }
    current += (current ? '\n\n' : '') + para;
    currentTokens += paraTokens;
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

// --- MAIN FUNCTION ---
export async function embedMarkdownFile(
  markdownPath: string
): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  try {
    // 1. Read file
    const absPath = path.isAbsolute(markdownPath)
      ? markdownPath
      : path.join(process.cwd(), markdownPath);
    const content = await fs.readFile(absPath, 'utf8');
    log.push(`Read file: ${markdownPath} (${content.length} chars)`);

    // 2. Chunk
    const chunks = chunkText(content, CHUNK_SIZE_TOKENS);
    log.push(`Split into ${chunks.length} chunks (~${CHUNK_SIZE_TOKENS} tokens each)`);

    // 3. Embed and upsert
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        // 3a. Get embedding
        const embeddingResp = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunk,
        });
        const embedding = embeddingResp.data[0].embedding;
        // 3b. Upsert into Supabase
        const { error } = await supabase
          .from(FOUNDER_KNOWLEDGE_TABLE)
          .upsert([
            {
              id: uuidv4(),
              content: chunk,
              embedding,
            },
          ], { onConflict: 'content' });
        if (error) {
          log.push(`❌ Chunk ${i + 1}: DB error: ${error.message}`);
        } else {
          log.push(`✅ Chunk ${i + 1}: Embedded and upserted`);
        }
      } catch (e) {
        log.push(`❌ Chunk ${i + 1}: Embedding error: ${e}`);
      }
    }
    return { success: true, log };
  } catch (e) {
    return { success: false, log: [`❌ Error reading file: ${e}`] };
  }
}

// --- SEARCH FUNCTION ---
export async function searchFounderKnowledge(
  query: string
): Promise<{ success: boolean; results: string[]; error?: string }> {
  try {
    // 1. Embed the query
    const embeddingResp = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });
    const queryEmbedding = embeddingResp.data[0].embedding;

    // 2. Search using Supabase vector similarity
    const { data, error } = await supabase
      .rpc('match_founder_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5
      });

    if (error) {
      // If the RPC function doesn't exist, fall back to client-side search
      console.warn('Vector search RPC not found, falling back to client-side search');
      return await searchFounderKnowledgeFallback(query, queryEmbedding);
    }

    // 3. Extract content from results
    const results = data?.map((row: any) => row.content) || [];
    
    return {
      success: true,
      results: results.slice(0, 5)
    };

  } catch (e) {
    return {
      success: false,
      results: [],
      error: `Search error: ${e}`
    };
  }
}

// --- FALLBACK SEARCH FUNCTION ---
async function searchFounderKnowledgeFallback(
  query: string,
  queryEmbedding: number[]
): Promise<{ success: boolean; results: string[]; error?: string }> {
  try {
    // Get all embeddings from the database
    const { data, error } = await supabase
      .from(FOUNDER_KNOWLEDGE_TABLE)
      .select('content, embedding');

    if (error) {
      return {
        success: false,
        results: [],
        error: `Database error: ${error.message}`
      };
    }

    // Calculate cosine similarity for each embedding
    const similarities = data.map((row: any) => ({
      content: row.content,
      similarity: cosineSimilarity(queryEmbedding, row.embedding)
    }));

    // Sort by similarity and return top 5
    const topResults = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(item => item.content);

    return {
      success: true,
      results: topResults
    };

  } catch (e) {
    return {
      success: false,
      results: [],
      error: `Fallback search error: ${e}`
    };
  }
}

// --- UTILITY FUNCTION FOR COSINE SIMILARITY ---
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Example usage (uncomment to run directly)
// (async () => {
//   const result = await embedMarkdownFile('lib/ai/docs/founder-guidance.md');
//   console.log(result.log.join('\n'));
// })();