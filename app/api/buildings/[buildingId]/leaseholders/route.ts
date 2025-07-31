import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(
  req: NextRequest,
  { params }: { params: { buildingId: string } }
) {
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

    const buildingId = params.buildingId

    // Get all leaseholders for this building
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select(`
        id,
        full_name,
        email,
        phone_number,
        correspondence_address,
        is_director,
        director_since,
        director_notes,
        units (
          id,
          unit_number
        )
      `)
      .eq('units.building_id', buildingId)
      .order('full_name')

    if (leaseholdersError) {
      console.error('Error fetching leaseholders:', leaseholdersError)
      return NextResponse.json(
        { error: 'Failed to fetch leaseholders' },
        { status: 500 }
      )
    }

    // Format the response
    const formattedLeaseholders = leaseholders?.map(leaseholder => ({
      id: leaseholder.id,
      full_name: leaseholder.full_name,
      email: leaseholder.email,
      phone_number: leaseholder.phone_number,
      correspondence_address: leaseholder.correspondence_address,
      is_director: leaseholder.is_director || false,
      director_since: leaseholder.director_since,
      director_notes: leaseholder.director_notes,
      unit_number: leaseholder.units?.unit_number
    })) || []

    return NextResponse.json({
      leaseholders: formattedLeaseholders,
      total: formattedLeaseholders.length,
      directors: formattedLeaseholders.filter(l => l.is_director)
    })

  } catch (error) {
    console.error('Error in leaseholders API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 