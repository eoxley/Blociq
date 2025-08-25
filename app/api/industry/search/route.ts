import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const category = searchParams.get('category')
    const type = searchParams.get('type') // 'all', 'documents', 'standards', 'guidance', 'extractions'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createClient(cookies())

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    let results: any = {}

    // Search using the database function for best performance
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_industry_knowledge', { search_query: query })

    if (searchError) {
      console.error('Search function error:', searchError)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Filter by category if specified
    let filteredResults = searchResults || []
    if (category) {
      filteredResults = filteredResults.filter((result: any) => 
        result.category.toLowerCase() === category.toLowerCase()
      )
    }

    // Filter by type if specified
    if (type && type !== 'all') {
      filteredResults = filteredResults.filter((result: any) => 
        result.type === type
      )
    }

    // Apply pagination
    const totalCount = filteredResults.length
    const paginatedResults = filteredResults.slice(offset, offset + limit)

    // Group results by type
    results.documents = paginatedResults.filter((r: any) => r.type === 'document')
    results.extractions = paginatedResults.filter((r: any) => r.type === 'extraction')
    results.standards = paginatedResults.filter((r: any) => r.type === 'standard')
    results.guidance = paginatedResults.filter((r: any) => r.type === 'guidance')

    // Add metadata
    results.metadata = {
      totalResults: totalCount,
      query,
      category: category || 'all',
      type: type || 'all',
      limit,
      offset,
      hasMore: offset + limit < totalCount,
      resultCounts: {
        documents: results.documents.length,
        extractions: results.extractions.length,
        standards: results.standards.length,
        guidance: results.guidance.length
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Industry search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
