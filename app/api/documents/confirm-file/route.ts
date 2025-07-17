import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const form = await req.formData()
  const supabase = createClient()

  const file_url = form.get('file_url') as string
  const type = form.get('type') as string
  const confidence = form.get('confidence') as string
  const suggested_action = form.get('suggested_action') as string
  const building_name = form.get('building_name') as string

  const { data: building } = await supabase
    .from('buildings')
    .select('id')
    .ilike('name', `%${building_name}%`)
    .maybeSingle()

  const building_id = building?.id ? parseInt(building.id, 10) : null

  // Insert or update the document entry
  const { error } = await supabase.from('building_documents').insert({
    file_url,
    type,
    building_id,
    file_name: file_url.split('/').pop() || 'document.pdf', // Extract filename from URL
  })

  if (error) {
    console.error('Error saving document:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Auto-link to compliance assets if it's a compliance document
  if (
    type.toLowerCase().includes('fire risk') ||
    type.toLowerCase().includes('eicr') ||
    type.toLowerCase().includes('asbestos') ||
    type.toLowerCase().includes('legionella') ||
    type.toLowerCase().includes('lightning') ||
    type.toLowerCase().includes('loler')
  ) {
    const { data: asset } = await supabase
      .from('compliance_assets')
      .select('id')
      .ilike('name', `%${type}%`)
      .maybeSingle()

    if (asset && building_id) {
      await supabase.from('building_compliance_assets').upsert({
        building_id,
        asset_id: asset.id,
        status: 'Compliant',
      })
    }
  }

  // Future: Add leaseholder/unit logic if type includes 'lease'
  if (type.toLowerCase().includes('lease')) {
    // TODO: Prompt for unit_id or leaseholder_id
    // This could be handled in the UI with a modal selection
  }

  return NextResponse.json({ 
    success: true, 
    building_id: building_id 
  })
} 