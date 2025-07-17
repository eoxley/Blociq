import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const buildingId = formData.get('building_id') as string
    const assetId = formData.get('asset_id') as string
    const nextDueDate = formData.get('next_due_date') as string

    if (!buildingId || !assetId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if the building compliance asset exists
    const { data: existingAsset, error: fetchError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('building_id', parseInt(buildingId, 10))
      .eq('asset_id', assetId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Error fetching asset' }, { status: 500 })
    }

    if (existingAsset) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('building_compliance_assets')
        .update({ 
          next_due_date: nextDueDate || null,
          last_updated: new Date().toISOString()
        })
        .eq('building_id', parseInt(buildingId, 10))
        .eq('asset_id', assetId)

      if (updateError) {
        return NextResponse.json({ error: 'Error updating due date' }, { status: 500 })
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('building_compliance_assets')
        .insert({
          building_id: parseInt(buildingId, 10),
          asset_id: assetId,
          status: 'Not Tracked',
          next_due_date: nextDueDate || null,
          last_updated: new Date().toISOString()
        })

      if (insertError) {
        return NextResponse.json({ error: 'Error creating asset record' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting due date:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 