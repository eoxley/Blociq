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

    // 1. Get building structure and status
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, structure_type, status')
      .eq('id', buildingId)
      .single()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      )
    }

    // 2. Get client information
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, phone, address, client_type, contact_person, website, notes')
      .eq('building_id', buildingId)
      .single()

    if (clientError && clientError.code !== 'PGRST116') {
      console.error('Error fetching client:', clientError)
    }

    // 3. Get RMC directors with leaseholder information
    const { data: directors, error: directorsError } = await supabase
      .from('rmc_directors')
      .select(`
        id,
        position,
        appointed_date,
        notes,
        leaseholder_id,
        leaseholders (
          id,
          full_name,
          email,
          phone_number
        )
      `)
      .eq('building_id', buildingId)

    if (directorsError) {
      console.error('Error fetching RMC directors:', directorsError)
    }

    // 4. Format the response
    const response = {
      building: {
        id: building.id,
        name: building.name,
        structure_type: building.structure_type || null,
        status: building.status || 'Standard'
      },
      client: client || null,
      rmc_directors: directors?.map(director => ({
        id: director.id,
        position: director.position,
        appointed_date: director.appointed_date,
        notes: director.notes,
        leaseholder: director.leaseholders
      })) || []
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in building structure API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to update building structure
export async function POST(
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
    const body = await req.json()

    // Update building structure and status
    if (body.structure_type !== undefined || body.status !== undefined) {
      const updateData: any = {}
      if (body.structure_type !== undefined) updateData.structure_type = body.structure_type
      if (body.status !== undefined) updateData.status = body.status

      const { error: buildingUpdateError } = await supabase
        .from('buildings')
        .update(updateData)
        .eq('id', buildingId)

      if (buildingUpdateError) {
        console.error('Error updating building:', buildingUpdateError)
        return NextResponse.json(
          { error: 'Failed to update building' },
          { status: 500 }
        )
      }
    }

    // Update or create client
    if (body.client) {
      const { error: clientError } = await supabase
        .from('clients')
        .upsert({
          building_id: buildingId,
          name: body.client.name,
          email: body.client.email,
          phone: body.client.phone,
          address: body.client.address,
          client_type: body.client.client_type,
          contact_person: body.client.contact_person,
          website: body.client.website,
          notes: body.client.notes
        }, {
          onConflict: 'building_id'
        })

      if (clientError) {
        console.error('Error updating client:', clientError)
        return NextResponse.json(
          { error: 'Failed to update client' },
          { status: 500 }
        )
      }
    }

    // Update RMC directors
    if (body.rmc_directors) {
      // First, delete existing directors for this building
      const { error: deleteError } = await supabase
        .from('rmc_directors')
        .delete()
        .eq('building_id', buildingId)

      if (deleteError) {
        console.error('Error deleting existing directors:', deleteError)
      }

      // Then insert new directors
      if (body.rmc_directors.length > 0) {
        const directorsData = body.rmc_directors.map((director: any) => ({
          building_id: buildingId,
          leaseholder_id: director.leaseholder_id,
          position: director.position,
          appointed_date: director.appointed_date,
          notes: director.notes
        }))

        const { error: insertError } = await supabase
          .from('rmc_directors')
          .insert(directorsData)

        if (insertError) {
          console.error('Error inserting directors:', insertError)
          return NextResponse.json(
            { error: 'Failed to update directors' },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in building structure update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 