import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    const { buildingId } = await params
    const body = await request.json()

    // Validate required fields
    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      )
    }

    // Validate building ID format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(buildingId)) {
      return NextResponse.json(
        { error: 'Invalid building ID format. Expected UUID.' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if building exists
    const { data: existingBuilding, error: fetchError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching building:', fetchError)
      return NextResponse.json(
        { 
          error: 'Building not found or error fetching building',
          details: fetchError.message
        },
        { status: 404 }
      )
    }

    if (!existingBuilding) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      )
    }

    console.log('✅ Building found:', existingBuilding.name)

    // Prepare update data (only include fields that are provided)
    const updateData: any = {}
    
    // Map frontend field names to database column names
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.key_access_notes !== undefined) updateData.key_access_notes = body.key_access_notes
    if (body.parking_notes !== undefined) updateData.parking_info = body.parking_notes
    if (body.entry_code !== undefined) updateData.entry_code = body.entry_code
    if (body.fire_panel_location !== undefined) updateData.fire_panel_location = body.fire_panel_location

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    // Log the request details for debugging
    console.log('🔍 Building update request:')
    console.log('  Building ID:', buildingId)
    console.log('  Request body:', body)
    console.log('  Mapped update data:', updateData)

    console.log('🔍 Updating building with ID:', buildingId)
    console.log('📝 Update data:', updateData)

    // Update the building
    const { data, error } = await supabase
      .from('buildings')
      .update(updateData)
      .eq('id', buildingId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating building:', error)
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json(
        { 
          error: 'Failed to update building information',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    console.log('✅ Building updated successfully:', data)

    return NextResponse.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('Error in building update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 