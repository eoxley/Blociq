import { NextResponse } from 'next/server'
import { searchBuildingAndUnits } from '@/lib/supabase/buildingSearch'

export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    console.log('🔍 Testing building search with query:', query)
    
    const results = await searchBuildingAndUnits(query)
    
    if (!results) {
      return NextResponse.json({
        success: false,
        message: 'No results found for the query',
        query
      })
    }

    return NextResponse.json({
      success: true,
      results,
      query
    })

  } catch (error) {
    console.error('❌ Error in test-building-search:', error)
    return NextResponse.json(
      { error: 'Failed to test building search', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
