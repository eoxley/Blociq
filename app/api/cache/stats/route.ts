// Cache Statistics and Management API
// Provides cache insights and management capabilities

import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { getCacheStatistics } = await import('@/lib/ocr/extraction-cache')
    const stats = await getCacheStatistics()
    
    return NextResponse.json({
      success: true,
      cache_stats: stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error fetching cache statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cache statistics' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const maxAge = parseInt(searchParams.get('maxAge') || '30')
    const minAccessCount = parseInt(searchParams.get('minAccessCount') || '2')

    const { cleanupCache } = await import('@/lib/ocr/extraction-cache')
    const deletedCount = await cleanupCache(maxAge, minAccessCount)
    
    return NextResponse.json({
      success: true,
      deleted_entries: deletedCount,
      message: `Cleaned up ${deletedCount} old cache entries`
    })

  } catch (error) {
    console.error('❌ Error cleaning cache:', error)
    return NextResponse.json(
      { error: 'Failed to clean cache' },
      { status: 500 }
    )
  }
}
