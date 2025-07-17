import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { building_id, asset_name, status } = await req.json()

    if (!building_id || !asset_name || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find the compliance asset by name
    const { data: complianceAsset } = await supabase
      .from('compliance_assets')
      .select('id')
      .eq('name', asset_name)
      .maybeSingle()

    if (!complianceAsset) {
      return NextResponse.json({ error: 'Compliance asset not found' }, { status: 404 })
    }

    // Update the building compliance asset status
    const { error: updateError } = await supabase
      .from('building_compliance_assets')
      .update({
        status: status,
        last_updated: new Date().toISOString()
      })
      .eq('building_id', parseInt(building_id, 10))
      .eq('asset_id', complianceAsset.id)

    if (updateError) {
      console.error('Error updating status:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Status update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 