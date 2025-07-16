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

  const unitIds = unit_id ? [unit_id] : await getUnitIdsForBuilding(building_id, supabase)

  const { data: leaseholders, error } = await supabase
    .from('leaseholders')
    .select('id, name, unit_id')
    .in('unit_id', unitIds)

  if (error || !leaseholders || leaseholders.length === 0) {
    return NextResponse.json({ error: 'No leaseholders found' }, { status: 404 })
  }

  const zip = new JSZip()

  for (const leaseholder of leaseholders) {
    const filename = `${leaseholder.name?.replace(/\s+/g, '_') || 'Resident'}_${Date.now()}.pdf`

    const docBuffer = await pdf(
      React.createElement(LetterDocument, {
        recipientName: leaseholder.name || 'Resident',
        subject: subject,
        content: content,
      })
    ).toBuffer()

    // Upload to Supabase Storage
    const uploadPath = `${building_id}/${filename}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('building-documents')
      .upload(uploadPath, docBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage
        .from('building-documents')
        .getPublicUrl(uploadPath)

      await supabase.from('building_documents').insert({
        building_id,
        unit_id: leaseholder.unit_id,
        leaseholder_id: leaseholder.id,
        file_name: filename,
        file_url: urlData.publicUrl,
        type: 'Letter',
      })
    }

    zip.file(filename, docBuffer)
  }

  const zipBlob = await zip.generateAsync({ type: 'nodebuffer' })

  return new NextResponse(zipBlob, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="letters-${Date.now()}.zip"`,
    },
  })
}

async function getUnitIdsForBuilding(buildingId: string, supabase: any) {
  const { data } = await supabase.from('units').select('id').eq('building_id', buildingId)
  return data?.map((u: any) => u.id) || []
} 