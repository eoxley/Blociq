import { NextResponse } from 'next/server'

// If you use these, keep; otherwise swap to your own utils:
let extractText: (buf: Uint8Array, name?: string) => Promise<string>
let summarizeAndSuggest: (text: string, name?: string) => Promise<{ summary: string; suggestedActions?: string[] }>

async function lazyDeps() {
  if (!extractText) {
    // Enhanced fallback with OCR capabilities
    try {
      const mod = await import('@/lib/extract-text')
      extractText = mod.extractText
    } catch {
      // Try alternative extraction methods
      try {
        const { extractTextFromPDF } = await import('@/lib/extractTextFromPdf')
        extractText = async (file: File) => {
          const buffer = Buffer.from(await file.arrayBuffer())
          const result = await extractTextFromPDF(buffer, file.name)
          return {
            text: result.text,
            meta: { name: file.name, type: file.type, bytes: file.size }
          }
        }
      } catch {
        // Final fallback with OCR
        try {
          const { ocrWithFallbacks } = await import('@/lib/ocr')
          extractText = async (file: File) => {
            const buffer = Buffer.from(await file.arrayBuffer())
            const ocrResult = await ocrWithFallbacks(buffer)
            return {
              text: ocrResult.text || `[[OCR Fallback]] ${file.name} (${file.size} bytes) - ${ocrResult.method}`,
              meta: { name: file.name, type: file.type, bytes: file.size }
            }
          }
        } catch {
          // Ultimate fallback
          extractText = async (file: File) => ({
            text: `[[Fallback extractor]] ${file.name} (${file.size} bytes). Unable to extract text - document may be image-based or corrupted.`,
            meta: { name: file.name, type: file.type, bytes: file.size }
          })
        }
      }
    }
  }
  if (!summarizeAndSuggest) {
    try {
      const mod = await import('@/lib/ask/summarize-and-suggest')
      summarizeAndSuggest = mod.summarizeAndSuggest
    } catch {
      // Enhanced fallback with document analysis
      try {
        const { generateSummary } = await import('@/lib/documentProcessor')
        summarizeAndSuggest = async (text: string, name?: string) => {
          const summary = await generateSummary(text, name || 'document')
          return {
            summary: summary || `Summary of ${name || 'document'}: ${text.slice(0, 300)}${text.length > 300 ? '…' : ''}`,
            suggestions: [
              'Confirm the document type and relevance.',
              'Assign to a property or general filing.',
              'Create any follow-up tasks or reminders.',
              'Review extracted text for accuracy.',
              'Consider manual verification if OCR was used.'
            ],
          }
        }
      } catch {
        // Super-light fallback; keep the route alive even if AI helper isn't ready
        summarizeAndSuggest = async (text: string, name?: string) => ({
          summary: `Summary placeholder for ${name || 'file'}: ${text.slice(0, 300)}${text.length > 300 ? '…' : ''}`,
          suggestions: [
            'Confirm the document type and relevance.',
            'Assign to a property or general filing.',
            'Create any follow-up tasks or reminders.',
          ],
        })
      }
    }
  }
}

// Required for Node-only PDF libs
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_FILE_BYTES = 12 * 1024 * 1024 // 12MB safety
const BUCKET = process.env.DOCS_BUCKET || 'documents'

// Allow preflight (defensive; same-origin form-data usually won't send this)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization',
    },
  })
}

export async function POST(req: Request) {
  await lazyDeps()
  const ct = req.headers.get('content-type') || ''
  try {
    // 1) Multipart: small drag-and-drop files
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file') as File | null
      const buildingId = (form.get('buildingId') as string) || (form.get('building_id') as string) || null // accept both parameter names

      if (!file) return NextResponse.json({ success: false, error: 'No file received' }, { status: 400 })
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { success: false, error: `File too large (${(file.size / 1048576).toFixed(1)} MB)`, code: 'FILE_TOO_LARGE' },
          { status: 413 }
        )
      }

      const ab = await file.arrayBuffer()
      const text = await extractText(file)
      
      // Determine if OCR was used
      const usedOCR = text.text.includes('[OCR Fallback]') || 
                     text.text.includes('[Fallback extractor]') ||
                     text.text.includes('[Enhanced processor]');
      
      // Get actual text length
      const len = text.text?.length || 0;
      
      // Only return success if we have meaningful text
      if (len < 20) {
        return NextResponse.json({
          success: false,
          message: 'OCR returned too little text to analyse.',
          textLength: len,
          usedOCR,
          filename: file.name
        }, { status: 200 });
      }
      
      return NextResponse.json({
        success: true,
        filename: file.name,
        buildingId,
        usedOCR,
        textLength: len,
        text: text.text, // Send full OCR text to the UI
        extractionMethod: usedOCR ? 'ocr' : 'standard',
        extractionNote: usedOCR ? 'Document processed using OCR - text accuracy may vary' : 'Standard text extraction'
      })
    }

    // 2) JSON: { path, buildingId? } → fetch from Supabase (already uploaded)
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      const path = body?.path as string | undefined
      const buildingId = (body?.buildingId as string) || null
      if (!path) return NextResponse.json({ success: false, error: 'path required' }, { status: 400 })

      // Lazy import to avoid bundling cost if you don't use this path
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data, error } = await supabase.storage.from(BUCKET).download(path)
      if (error || !data) return NextResponse.json({ success: false, error: error?.message || 'download failed' }, { status: 500 })

      const ab = await data.arrayBuffer()
      const text = await extractText(new Uint8Array(ab), path)
      const out = await summarizeAndSuggest(text, path)
      return NextResponse.json({
        success: true,
        filename: path.split('/').pop(),
        buildingId,
        summary: out.summary,
        suggestedActions: out.suggestedActions ?? [],
      })
    }

    return NextResponse.json({ success: false, error: `Unsupported content-type: ${ct}` }, { status: 415 })
  } catch (e: any) {
    const msg = e?.message || 'Unexpected error'
    console.error('ask-ai/upload error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
