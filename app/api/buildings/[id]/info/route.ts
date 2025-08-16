import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeId = 'app/api/buildings/[id]/info/route.ts'
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

    // Fetch building notes
    const { data: notesData, error: notesError } = await supabase
      .from('building_notes')
      .select('*')
      .eq('building_id', buildingId)
      .maybeSingle()

    if (notesError) {
      console.error('Error fetching building notes:', notesError)
    }

    // Fetch building structure
    const { data: structureData, error: structureError } = await supabase
      .from('building_structure')
      .select('*')
      .eq('building_id', buildingId)
      .maybeSingle()

    if (structureError) {
      console.error('Error fetching building structure:', structureError)
    }

    return NextResponse.json({
      ok: true,
      notes: notesData || null,
      structure: structureData || null,
      routeId,
      build
    })

  } catch (error) {
    console.error('Error in building info API:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to fetch building info',
      diagnostic: error instanceof Error ? error.message : 'Unknown error',
      routeId,
      build
    })
  }
}
