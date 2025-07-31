import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { buildingId, directorIds } = await req.json()

    if (!buildingId || !Array.isArray(directorIds)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // First, reset all leaseholders in this building to not be directors
    const { error: resetError } = await supabase
      .from('leaseholders')
      .update({ 
        is_director: false,
        director_since: null,
        director_notes: null
      })
      .eq('units.building_id', buildingId)

    if (resetError) {
      console.error('Error resetting director status:', resetError)
      return NextResponse.json(
        { error: 'Failed to reset director status' },
        { status: 500 }
      )
    }

    // Then, set the selected leaseholders as directors
    if (directorIds.length > 0) {
      const { error: updateError } = await supabase
        .from('leaseholders')
        .update({ 
          is_director: true,
          director_since: new Date().toISOString().split('T')[0],
          director_notes: 'Appointed via building structure modal'
        })
        .in('id', directorIds)

      if (updateError) {
        console.error('Error updating director status:', updateError)
        return NextResponse.json(
          { error: 'Failed to update director status' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${directorIds.length} directors`,
      updatedCount: directorIds.length
    })

  } catch (error) {
    console.error('Error in update directors API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 