// /app/api/communications/generate-letters/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'
import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { LetterDocument } from '../../../../components/letters/LetterDocument'
import { Database } from '../../../../lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()

  const { building_id, unit_id, subject, content } = body

  // Fetch leaseholders
  const { data: leaseholders, error } = await supabase
    .from('leaseholders')
    .select('name, unit_id')
    .in('unit_id', unit_id ? [unit_id] : await getUnitIdsForBuilding(building_id, supabase))

  if (error || !leaseholders || leaseholders.length === 0) {
    return NextResponse.json({ error: 'No leaseholders found' }, { status: 404 })
  }

  // Generate PDFs
  const zip = new JSZip()

  for (const leaseholder of leaseholders) {
    const doc = await pdf(
      React.createElement(LetterDocument, {
        recipientName: leaseholder.name || 'Resident',
        subject: subject,
        content: content,
      })
    ).toBuffer()

    zip.file(`${leaseholder.name?.replace(/\s+/g, '_') || 'Resident'}.pdf`, doc)
  }

  const zipBlob = await zip.generateAsync({ type: 'nodebuffer' })

  return new NextResponse(zipBlob, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="letters.zip"`,
    },
  })
}

async function getUnitIdsForBuilding(buildingId: string, supabase: any) {
  const { data } = await supabase
    .from('units')
    .select('id')
    .eq('building_id', buildingId)

  return data?.map((u: any) => u.id) || []
} 