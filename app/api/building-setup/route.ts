import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { 
      building_id, 
      structure_type, 
      client_type, 
      client_name, 
      client_contact, 
      client_email, 
      assigned_manager, 
      operational_notes 
    } = body

    // Check if building setup exists
    const { data: existingSetup } = await supabase
      .from('building_setup')
      .select('id')
      .eq('building_id', building_id)
      .single()

    if (existingSetup) {
      // Update existing building setup
      const { error: setupError } = await supabase
        .from('building_setup')
        .update({
          structure_type,
          client_type,
          client_name,
          client_contact,
          client_email,
          assigned_manager,
          operational_notes,
          updated_at: new Date().toISOString()
        })
        .eq('building_id', building_id)

      if (setupError) {
        console.error('Error updating building setup:', setupError)
        return NextResponse.json({ error: setupError.message }, { status: 500 })
      }
    } else {
      // Create new building setup
      const { error: setupError } = await supabase
        .from('building_setup')
        .insert({
          building_id,
          structure_type,
          client_type,
          client_name,
          client_contact,
          client_email,
          assigned_manager,
          operational_notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (setupError) {
        console.error('Error creating building setup:', setupError)
        return NextResponse.json({ error: setupError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in building setup API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      building_id,
      structure_type,
      client_type,
      client_name,
      client_contact,
      client_email,
      assigned_manager,
      operational_notes,
      keys_location,
      emergency_access,
      site_staff,
      insurance_contact,
      cleaners,
      contractors
    } = body

    // Check if building setup exists
    const { data: existingSetup } = await supabase
      .from('building_setup')
      .select('id')
      .eq('building_id', building_id)
      .single()

    if (existingSetup) {
      // Update existing building setup
      const updateData: any = {}
      if (structure_type !== undefined) updateData.structure_type = structure_type
      if (client_type !== undefined) updateData.client_type = client_type
      if (client_name !== undefined) updateData.client_name = client_name
      if (client_contact !== undefined) updateData.client_contact = client_contact
      if (client_email !== undefined) updateData.client_email = client_email
      if (assigned_manager !== undefined) updateData.assigned_manager = assigned_manager
      if (operational_notes !== undefined) updateData.operational_notes = operational_notes
      if (keys_location !== undefined) updateData.keys_location = keys_location
      if (emergency_access !== undefined) updateData.emergency_access = emergency_access
      if (site_staff !== undefined) {
        updateData.site_staff = site_staff
        updateData.site_staff_updated_at = new Date().toISOString()
      }
      if (insurance_contact !== undefined) updateData.insurance_contact = insurance_contact
      if (cleaners !== undefined) updateData.cleaners = cleaners
      if (contractors !== undefined) updateData.contractors = contractors

      updateData.updated_at = new Date().toISOString()

      const { error: setupError } = await supabase
        .from('building_setup')
        .update(updateData)
        .eq('building_id', building_id)

      if (setupError) {
        console.error('Error updating building setup:', setupError)
        return NextResponse.json({ error: setupError.message }, { status: 500 })
      }
    } else {
      // Create new building setup
      const { error: setupError } = await supabase
        .from('building_setup')
        .insert({
          building_id,
          structure_type,
          client_type,
          client_name,
          client_contact,
          client_email,
          assigned_manager,
          operational_notes,
          keys_location,
          emergency_access,
          site_staff,
          site_staff_updated_at: site_staff ? new Date().toISOString() : null,
          insurance_contact,
          cleaners,
          contractors,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (setupError) {
        console.error('Error creating building setup:', setupError)
        return NextResponse.json({ error: setupError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in building setup PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 