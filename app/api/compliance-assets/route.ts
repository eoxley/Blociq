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
    return NextResponse.redirect(`/buildings/${building_id}/compliance/tracker?error=asset_not_found`)
  }

  const { data: exists } = await supabase
    .from('building_compliance_assets')
    .select('id')
    .eq('building_id', parseInt(building_id, 10))
    .eq('asset_id', complianceAsset.id)
    .maybeSingle()

  if (exists) {
    // Remove the row
    await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('id', exists.id)
  } else {
    // Add the row
    await supabase.from('building_compliance_assets').insert({
      building_id: parseInt(building_id, 10),
      asset_id: complianceAsset.id,
      status: 'Missing',
    })
  }

  return NextResponse.redirect(`/buildings/${building_id}/compliance/tracker`)
} 