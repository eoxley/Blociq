import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { building_id, asset_name, status } = body

    if (!building_id || !asset_name || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient(cookies())

    // Update the compliance asset status
    const { error } = await supabase
      .from('building_compliance_assets')
      .update({
        status: status,
        last_updated: new Date().toISOString()
      })
      .eq('building_id', parseInt(building_id, 10))
      .eq('asset_id', asset_name)

    if (error) {
      console.error('Error updating compliance asset status:', error)
      return NextResponse.json(
        { error: 'Failed to update compliance asset status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Compliance asset status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 