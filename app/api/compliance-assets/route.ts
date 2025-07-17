import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const form = await req.formData()
  const supabase = createClient()

  const building_id = form.get('building_id') as string
  const asset_name = form.get('asset_name') as string

  // Find the compliance asset by name
  const { data: complianceAsset } = await supabase
    .from('compliance_assets')
    .select('id')
    .eq('name', asset_name)
    .maybeSingle()

  if (!complianceAsset) {
    return NextResponse.json({ error: 'Compliance asset not found' }, { status: 404 })
  }

  const { data: exists } = await supabase
    .from('building_compliance_assets')
    .select('id')
    .eq('building_id', parseInt(building_id, 10))
    .eq('asset_id', complianceAsset.id)
    .maybeSingle()

  if (exists) {
    // Remove the row
    const { error: deleteError } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('id', exists.id)
    
    if (deleteError) {
      return NextResponse.json({ error: 'Failed to remove asset' }, { status: 500 })
    }
  } else {
    // Add the row
    const { error: insertError } = await supabase.from('building_compliance_assets').insert({
      building_id: parseInt(building_id, 10),
      asset_id: complianceAsset.id,
      status: 'Missing',
    })
    
    if (insertError) {
      return NextResponse.json({ error: 'Failed to add asset' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
} 