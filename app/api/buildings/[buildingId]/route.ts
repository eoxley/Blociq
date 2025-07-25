import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '../../../../lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    const { buildingId } = await params
    const body = await request.json()
    const { buildingData, setupData } = body

    // Update building information
    const { error: buildingError } = await supabase
      .from('buildings')
      .update(buildingData)
      .eq('id', buildingId)

    if (buildingError) {
      console.error('Error updating building:', buildingError)
      return NextResponse.json({ error: buildingError.message }, { status: 500 })
    }

    // Check if building setup exists
    const { data: existingSetup } = await supabase
      .from('building_setup')
      .select('id')
      .eq('building_id', buildingId)
      .single()

    if (existingSetup) {
      // Update existing building setup
      const { error: setupError } = await supabase
        .from('building_setup')
        .update({
          ...setupData,
          updated_at: new Date().toISOString()
        })
        .eq('building_id', buildingId)

      if (setupError) {
        console.error('Error updating building setup:', setupError)
        return NextResponse.json({ error: setupError.message }, { status: 500 })
      }
    } else {
      // Create new building setup
      const { error: setupError } = await supabase
        .from('building_setup')
        .insert({
          building_id: parseInt(buildingId),
          ...setupData,
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
    console.error('Error in building update API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 