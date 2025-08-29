import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../../lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()

  const { building_id, unit_id, subject, content } = body

  const unitIds = unit_id ? [unit_id] : await getUnitIdsForBuilding(building_id, supabase)

  const { data: leaseholders, error } = await supabase
    .from('leaseholders')
    .select('id, name, unit_id')
    .in('unit_id', unitIds)

  if (error || !leaseholders || leaseholders.length === 0) {
    return NextResponse.json({ error: 'No leaseholders found' }, { status: 404 })
  }

  // Return letter data instead of generating PDFs for now
  const letters = leaseholders.map(leaseholder => ({
    recipient: leaseholder.name || 'Resident',
    unit_id: leaseholder.unit_id,
    subject: subject,
    content: content,
  }))

  return NextResponse.json({ 
    message: 'Letters prepared successfully',
    count: letters.length,
    letters: letters
  })
}

async function getUnitIdsForBuilding(buildingId: string, supabase: any) {
  const { data } = await supabase.from('units').select('id').eq('building_id', buildingId)
  return data?.map((u: any) => u.id) || []
} 