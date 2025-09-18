import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string; assetId: string }> }
) {
  try {
    const { buildingId, assetId } = await params
    const body = await req.json()
    console.log('🔍 [API] PUT request body:', body)
    console.log('🔍 [API] Building ID:', buildingId, 'Asset ID:', assetId)

    const {
      status,
      notes,
      next_due_date,
      last_renewed_date,
      last_carried_out,
      inspector_provider,
      certificate_reference,
      contractor,
      override_reason,
      frequency_months
    } = body

    const supabase = await createClient()

    // Check authentication - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession()
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const authError = sessionResult?.error || null
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate building exists and user has access
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      console.error('Building validation error:', buildingError)
      console.error('Building ID:', buildingId, 'User ID:', session.user.id)
      return NextResponse.json(
        { 
          error: 'Building not found or access denied',
          details: buildingError?.message 
        },
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
      console.error('Asset validation error:', assetError)
      console.error('Asset ID:', assetId, 'Building ID:', buildingId)
      return NextResponse.json(
        { 
          error: 'Compliance asset not found',
          details: assetError?.message 
        },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    
    // Validate and format dates
    if (next_due_date !== undefined) {
      if (next_due_date && next_due_date !== '') {
        const parsedDate = new Date(next_due_date)
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid next_due_date format' },
            { status: 400 }
          )
        }
        updateData.next_due_date = next_due_date
      } else {
        updateData.next_due_date = null
      }
    }
    
    if (last_renewed_date !== undefined) {
      if (last_renewed_date && last_renewed_date !== '') {
        const parsedDate = new Date(last_renewed_date)
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid last_renewed_date format' },
            { status: 400 }
          )
        }
        updateData.last_renewed_date = last_renewed_date
      } else {
        updateData.last_renewed_date = null
      }
    }
    
    if (last_carried_out !== undefined) {
      if (last_carried_out && last_carried_out !== '') {
        const parsedDate = new Date(last_carried_out)
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid last_carried_out format' },
            { status: 400 }
          )
        }
        updateData.last_carried_out = last_carried_out
      } else {
        updateData.last_carried_out = null
      }
    }
    
    if (inspector_provider !== undefined) updateData.inspector_provider = inspector_provider || null
    if (certificate_reference !== undefined) updateData.certificate_reference = certificate_reference || null
    if (contractor !== undefined) updateData.contractor = contractor || null
    if (override_reason !== undefined) updateData.override_reason = override_reason || null
    if (frequency_months !== undefined) updateData.frequency_months = frequency_months || null

    console.log('🔍 [API] Final update data:', updateData)

    // Update the compliance asset
    const { data, error } = await supabase
      .from('building_compliance_assets')
      .update(updateData)
      .eq('id', assetId)
      .select()

    if (error) {
      console.error('Error updating compliance asset:', error)
      console.error('Update data was:', updateData)
      console.error('Asset ID:', assetId, 'Building ID:', buildingId)
      return NextResponse.json(
        { 
          error: 'Failed to update compliance asset', 
          details: error.message,
          code: error.code
        },
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

    const supabase = await createClient()

    // Check authentication - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession()
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const authError = sessionResult?.error || null
    
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
