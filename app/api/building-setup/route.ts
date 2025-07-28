import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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