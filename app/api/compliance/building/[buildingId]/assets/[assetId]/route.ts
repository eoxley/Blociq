import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string; assetId: string }> }
) {
  try {
    const { buildingId, assetId } = await params
    const body = await req.json()
    const { status, notes, next_due_date, last_renewed_date } = body

    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate building exists
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      )
    }

    // Validate asset exists
    const { data: asset, error: assetError } = await supabase
      .from('building_compliance_assets')
      .select('id')
      .eq('id', assetId)
      .eq('building_id', buildingId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json(
        { error: 'Compliance asset not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (next_due_date !== undefined) updateData.next_due_date = next_due_date || null
    if (last_renewed_date !== undefined) updateData.last_renewed_date = last_renewed_date || null

    // Update the compliance asset
    const { data, error } = await supabase
      .from('building_compliance_assets')
      .update(updateData)
      .eq('id', assetId)
      .select()

    if (error) {
      console.error('Error updating compliance asset:', error)
      return NextResponse.json(
        { error: 'Failed to update compliance asset' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data[0]
    })

  } catch (error) {
    console.error('Error in compliance asset update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string; assetId: string }> }
) {
  try {
    const { buildingId, assetId } = await params

    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate building exists
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      )
    }

    // Delete the compliance asset
    const { error } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('id', assetId)
      .eq('building_id', buildingId)

    if (error) {
      console.error('Error deleting compliance asset:', error)
      return NextResponse.json(
        { error: 'Failed to delete compliance asset' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance asset deleted successfully'
    })

  } catch (error) {
    console.error('Error in compliance asset delete API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
