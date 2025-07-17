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

  // Optional: auto-attach to compliance or lease if applicable
  if (type.toLowerCase().includes('fire risk') || type.toLowerCase().includes('eicr')) {
    // TODO: insert into building_compliance_assets or link to compliance dashboard
  }

  if (building_id) {
    return NextResponse.redirect(`/buildings/${building_id}/documents`)
  } else {
    return NextResponse.redirect('/documents')
  }
} 