import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeId = 'app/api/buildings/[id]/notes/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    const supabase = createClient(cookies())
    
    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({
        ok: false,
        error: 'Unauthorized',
        routeId,
        build
      }, { status: 401 })
    }

    const buildingId = params.id
    const body = await request.json()
    const { content_markdown, content_html } = body

    if (!content_markdown) {
      return NextResponse.json({
        ok: false,
        error: 'content_markdown is required',
        routeId,
        build
      })
    }

    // Upsert building notes
    const { data, error } = await supabase
      .from('building_notes')
      .upsert({
        building_id: buildingId,
        title: 'Building Information',
        content_markdown,
        content_html: content_html || content_markdown,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'building_id'
      })

    if (error) {
      console.error('Error saving building notes:', error)
      return NextResponse.json({
        ok: false,
        error: 'Failed to save building notes',
        diagnostic: error.message,
        routeId,
        build
      })
    }

    return NextResponse.json({
      ok: true,
      data,
      routeId,
      build
    })

  } catch (error) {
    console.error('Error in building notes API:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to save building notes',
      diagnostic: error instanceof Error ? error.message : 'Unknown error',
      routeId,
      build
    })
  }
}
