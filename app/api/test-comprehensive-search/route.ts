import { NextResponse } from 'next/server'
import { searchEntireDatabase, formatSearchResultsForAI, extractRelevantContext } from '@/lib/supabase/comprehensiveDataSearch'

export async function POST(req: Request) {
  try {
    const { query, maxResults = 20 } = await req.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    console.log('🧪 Testing comprehensive database search with query:', query)
    
    const results = await searchEntireDatabase(query, undefined, maxResults)
    
    // Format results for AI
    const aiFormattedContext = formatSearchResultsForAI(results)
    
    // Extract relevant context
    const relevantContext = extractRelevantContext(results, query)
    
    // Calculate total results
    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    
    return NextResponse.json({
      success: true,
      query,
      totalResults,
      results,
      aiFormattedContext,
      relevantContext,
      summary: {
        buildings: results.buildings.length,
        units: results.units.length,
        leaseholders: results.leaseholders.length,
        documents: results.documents.length,
        compliance: results.compliance.length,
        communications: results.communications.length,
        todos: results.todos.length,
        majorWorks: results.majorWorks.length,
        financials: results.financials.length,
        events: results.events.length,
        assets: results.assets.length,
        maintenance: results.maintenance.length
      }
    })

  } catch (error) {
    console.error('❌ Error in test-comprehensive-search:', error)
    return NextResponse.json(
      { error: 'Failed to test comprehensive search', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
