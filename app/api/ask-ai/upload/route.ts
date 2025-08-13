import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractText } from '@/lib/extract-text'
import { summarizeAndSuggest } from '@/lib/ask/summarize-and-suggest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB
const BUCKET = process.env.DOCS_BUCKET || 'documents'

export async function POST(req: Request) {
  const ct = req.headers.get('content-type') || ''
  try {
    // 1) Small files: multipart/form-data
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file') as File | null
      const buildingId = (form.get('buildingId') as string) || null
      
      if (!file) {
        return NextResponse.json({ 
          success: false, 
          error: 'No file received' 
        }, { status: 400 })
      }
      
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ 
          success: false, 
          error: `File too large (${(file.size/1048576).toFixed(1)} MB)`, 
          code: 'FILE_TOO_LARGE' 
        }, { status: 413 })
      }
      
      const { text, meta } = await extractText(file)
      const { summary, suggestions } = await summarizeAndSuggest(text, meta.name)
      
      return NextResponse.json({ 
        success: true, 
        filename: file.name, 
        buildingId, 
        summary: summary, 
        suggestedActions: suggestions ?? [] 
      })
    }

    // 2) Large files: JSON { path, buildingId? } (already in Supabase)
    if (ct.includes('application/json')) {
      const { path, buildingId = null } = await req.json().catch(() => ({}))
      
      if (!path) {
        return NextResponse.json({ 
          success: false, 
          error: 'path required' 
        }, { status: 400 })
      }
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data, error } = await supabase.storage.from(BUCKET).download(path)
      
      if (error || !data) {
        return NextResponse.json({ 
          success: false, 
          error: error?.message || 'download failed' 
        }, { status: 500 })
      }
      
      const ab = await data.arrayBuffer()
      const bytes = new Uint8Array(ab)
      
      // Create a mock File object for extractText
      const mockFile = {
        arrayBuffer: () => Promise.resolve(ab),
        name: path.split('/').pop() || 'unknown'
      } as File
      
      const { text, meta } = await extractText(mockFile)
      const { summary, suggestions } = await summarizeAndSuggest(text, meta.name)
      
      return NextResponse.json({ 
        success: true, 
        filename: path.split('/').pop(), 
        buildingId, 
        summary: summary, 
        suggestedActions: suggestions ?? [] 
      })
    }

    return NextResponse.json({ 
      success: false, 
      error: `Unsupported content-type: ${ct}` 
    }, { status: 415 })
  } catch (e: any) {
    const msg = e?.message || 'Unexpected error'
    console.error('ask-ai/upload error:', msg)
    return NextResponse.json({ 
      success: false, 
      error: msg 
    }, { status: 500 })
  }
}
