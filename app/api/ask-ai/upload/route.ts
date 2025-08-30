export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { processFileWithOCR } from '@/lib/ai/ocrClient'

const MIN = 50 // chars to count as "real text"

async function ocrWithFallback(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  
  // 1) External OCR (Render) with retry
  for (let i = 0; i < 2; i++) {
    try {
      const result = await processFileWithOCR(file) // hits https://ocr-server...
      if (result?.success && result?.text?.trim().length) {
        return { text: result.text, used: 'external' as const }
      }
    } catch (e: any) {
      console.log(`⚠️ External OCR attempt ${i + 1} failed:`, e?.message || 'unknown error')
    }
    // small backoff
    if (i < 1) await new Promise(r => setTimeout(r, 600))
  }

  // 2) Local fallback (/api/ocr) - if you have one
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/ocr`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/pdf' }, 
      body: bytes,
    })
    if (res.ok) {
      const j = await res.json().catch(() => ({}))
      if (j?.text?.trim().length) {
        return { text: j.text as string, used: 'local' as const }
      }
    }
  } catch (e: any) {
    console.log('⚠️ Local OCR fallback failed:', e?.message || 'unknown error')
  }
  
  return { text: '', used: 'none' as const }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    
    if (!(file instanceof File)) {
      return Response.json({ 
        success: false, 
        message: 'No file uploaded.' 
      }, { status: 400 })
    }

    const { text, used } = await ocrWithFallback(file)
    const textLength = (text || '').trim().length

    if (textLength < MIN) {
      return Response.json({
        success: false,
        filename: file.name,
        textLength,
        usedOCR: used !== 'none',
        source: used,
        message: 'Document processing failed - insufficient text extracted.',
      })
    }

    return Response.json({
      success: true,
      filename: file.name,
      usedOCR: true,
      source: used,      // 'external' | 'local'
      textLength,
      text,              // <-- raw OCR text for UI
    })
  } catch (error: any) {
    console.error('❌ OCR upload error:', error)
    return Response.json({
      success: false,
      message: `Upload failed: ${error?.message || 'Unknown error'}`,
      textLength: 0,
      usedOCR: false,
      source: 'none'
    }, { status: 500 })
  }
}
