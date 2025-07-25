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

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Prepare update data (only include fields that are provided)
    const updateData: any = {}
    
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.key_access_notes !== undefined) updateData.key_access_notes = body.key_access_notes
    if (body.parking_notes !== undefined) updateData.parking_notes = body.parking_notes
    if (body.entry_code !== undefined) updateData.entry_code = body.entry_code
    if (body.fire_panel_location !== undefined) updateData.fire_panel_location = body.fire_panel_location

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    // Update the building
    const { data, error } = await supabase
      .from('buildings')
      .update(updateData)
      .eq('id', buildingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating building:', error)
      return NextResponse.json(
        { error: 'Failed to update building information' },
        { status: 500 }
      )
    }

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