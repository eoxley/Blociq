import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { extractTextFromPDF } from '@/lib/pdf/extractTextFromPDF'
import { OpenAI } from 'openai'
import { Buffer } from 'buffer'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const supabase = createClient()
  const formData = await req.formData()

  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = Buffer.from(arrayBuffer)
  const fileName = `${Date.now()}-${file.name}`

  // Upload to Supabase Storage
  const path = `unclassified/${fileName}`
  const { error: uploadError } = await supabase.storage
    .from('building-documents')
    .upload(path, fileBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError.message)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const extractedText = await extractTextFromPDF(fileBuffer)

  const prompt = `You are a UK property management assistant. Classify this document.

Return this JSON:
{
  "type": "...",                        // Choose from predefined list
  "building_name": "...",              // From doc if found
  "suggested_action": "...",           // E.g. "Link to compliance tracker"
  "confidence": "High | Medium | Low"
}

Only choose document types from:
- Lease Agreement
- Deed of Variation
- Meeting Minutes (AGM or Directors)
- Scope of Works
- Insurance Schedule
- Insurance Quote
- Fire Risk Assessment
- EICR (Electrical Safety)
- Asbestos Report
- Water Hygiene Report
- Lift LOLER Certificate
- Section 20 Notice
- Building Safety Case Report
- Contractor Quote or Invoice
- Service Charge Budget
- Unknown / Other

Document content:
${extractedText.slice(0, 4000)}`

  const aiResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  })

  const result = aiResponse.choices[0].message?.content || '{}'

  return NextResponse.json({
    file_url: supabase.storage.from('building-documents').getPublicUrl(path).data.publicUrl,
    ai: JSON.parse(result),
  })
} 