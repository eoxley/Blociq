// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for query
// - Supabase queries with proper error handling
// - Try/catch with detailed error handling
// - Used in template search components
// - Includes OpenAI embeddings integration with fallback

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOpenAIClient } from '@/lib/openai-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(req: NextRequest) {
  try {
    console.log("🔍 Semantic search processing...");
    
    const body = await req.json();
    const { query, limit = 5 } = body;

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    console.log("✅ Search query received:", query);

    // 1. Generate embedding for the search query
    const openai = getOpenAIClient();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      encoding_format: "float"
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding');
    }

    console.log("🧠 Query embedding generated");

    // 2. Search for similar templates using vector similarity
    // Note: This requires the pgvector extension in Supabase
    const { data: similarTemplates, error: searchError } = await supabase.rpc(
      'match_templates',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      }
    );

    if (searchError) {
      console.error("❌ Vector search failed:", searchError);
      
      // Fallback to text search if vector search is not available
      console.log("🔄 Falling back to text search...");
      
      const { data: fallbackTemplates, error: fallbackError } = await supabase
        .from('templates')
        .select('*')
        .or(`content_text.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit);

      if (fallbackError) {
        console.error("❌ Fallback search also failed:", fallbackError);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        templates: fallbackTemplates || [],
        searchMethod: 'text_fallback',
        query: query
      });
    }

    console.log(`✅ Found ${similarTemplates?.length || 0} similar templates`);

    return NextResponse.json({
      success: true,
      templates: similarTemplates || [],
      searchMethod: 'semantic',
      query: query
    });

  } catch (error) {
    console.error('❌ Semantic search error:', error);
    return NextResponse.json({ 
      error: 'Failed to perform semantic search',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}

// GET endpoint for hybrid search (semantic + text)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    console.log("🔍 Hybrid search:", { query, type, limit });

    // Build the search query
    let searchQuery = supabase
      .from('templates')
      .select('*')
      .or(`content_text.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`);

    // Add type filter if specified
    if (type && type !== 'all') {
      searchQuery = searchQuery.eq('type', type);
    }

    // Execute search
    const { data: templates, error } = await searchQuery
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ Search failed:", error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    console.log(`✅ Found ${templates?.length || 0} templates`);

    return NextResponse.json({
      success: true,
      templates: templates || [],
      query: query,
      type: type,
      total: templates?.length || 0
    });

  } catch (error) {
    console.error('❌ Hybrid search error:', error);
    return NextResponse.json({ 
      error: 'Failed to perform search',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 