import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string; assetId: string }> }
) {
  try {
    const { buildingId, assetId } = await params
    const body = await request.json()

    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate building compliance asset exists
    const { data: existingAsset, error: fetchError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('id', assetId)
      .eq('building_id', buildingId)
      .single()

    if (fetchError || !existingAsset) {
      return NextResponse.json(
        { error: 'Building compliance asset not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.status !== undefined) updateData.status = body.status
    if (body.due_date !== undefined) updateData.due_date = body.due_date || null
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to || null
    if (body.notes !== undefined) updateData.notes = body.notes || null

    // Update the building compliance asset
    const { data, error } = await supabase
      .from('building_compliance_assets')
      .update(updateData)
      .eq('id', assetId)
      .eq('building_id', buildingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating building compliance asset:', error)
      return NextResponse.json(
        { error: 'Failed to update compliance asset' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data
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

    // Delete the building compliance asset
    const { error } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('id', assetId)
      .eq('building_id', buildingId)

    if (error) {
      console.error('Error deleting building compliance asset:', error)
      return NextResponse.json(
        { error: 'Failed to delete compliance asset' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Error in compliance asset delete API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 