import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const buildingId = formData.get('building_id') as string
    const assetName = formData.get('asset_name') as string
    const toggle = formData.get('toggle') as string

    if (!buildingId || !assetName || toggle === null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient(cookies())

    if (toggle === '1') {
      // Add compliance asset to building
      const { error } = await supabase
        .from('building_compliance_assets')
        .insert({
          building_id: parseInt(buildingId, 10),
          asset_id: assetName,
          status: 'Missing',
          last_updated: new Date().toISOString()
        })

      if (error) {
        console.error('Error adding compliance asset:', error)
        return NextResponse.json(
          { error: 'Failed to add compliance asset' },
          { status: 500 }
        )
      }
    } else {
      // Remove compliance asset from building
      const { error } = await supabase
        .from('building_compliance_assets')
        .delete()
        .eq('building_id', parseInt(buildingId, 10))
        .eq('asset_id', assetName)

      if (error) {
        console.error('Error removing compliance asset:', error)
        return NextResponse.json(
          { error: 'Failed to remove compliance asset' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Compliance assets API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 