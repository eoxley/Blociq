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
  const contentType = req.headers.get('content-type') || ''
  console.log('🚀 Upload endpoint hit with content-type:', contentType)
  
  try {
    // Path 1: small files via multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      console.log('📁 Processing multipart upload')
      const form = await req.formData()
      const file = form.get('file') as File | null
      const buildingId = (form.get('buildingId') as string) || null

      if (!file) {
        console.log('❌ No file received')
        return NextResponse.json({ success: false, error: 'No file received' }, { status: 400 })
      }
      
      console.log('📄 File received:', file.name, file.type, file.size)
      
      if (file.size > MAX_FILE_BYTES) {
        const sizeMB = (file.size / 1048576).toFixed(1)
        console.log(`❌ File too large: ${sizeMB} MB`)
        return NextResponse.json({
          success: false,
          error: `File too large (${sizeMB} MB). Use direct upload.`,
          code: 'FILE_TOO_LARGE',
        }, { status: 413 })
      }

      const { text, meta } = await extractText(file)
      console.log('📝 Text extracted, length:', text.length)
      
      const { summary, suggestions } = await summarizeAndSuggest(text, meta.name)
      console.log('🤖 Summary generated, suggestions:', suggestions.length)

      // Save to database if Supabase is available
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        
        try {
          await supabase.from('document_analyses').insert({
            building_id: buildingId, 
            filename: meta.name, 
            mime_type: meta.type, 
            size_bytes: meta.bytes,
            summary, 
            source: 'ask-blociq'
          })
          console.log('💾 Document analysis saved to database')
        } catch (dbError) {
          console.warn('⚠️ Failed to store document analysis:', dbError)
          // Don't fail the request if this fails
        }
      }

      console.log('✅ Small file upload completed successfully')
      return NextResponse.json({
        success: true,
        filename: file.name,
        bytes: file.size,
        buildingId, // may be null, that's fine
        summary: summary,
        suggestedActions: suggestions ?? [],
        textExcerpt: text.slice(0, 4000),
      })
    }

    // Path 2: JSON { path, buildingId? } — process file from Supabase Storage
    if (contentType.includes('application/json')) {
      console.log('📋 Processing JSON request for stored file')
      const { path, buildingId = null } = await req.json().catch(() => ({}))
      
      if (!path) {
        console.log('❌ No path provided in JSON request')
        return NextResponse.json({ success: false, error: 'path required' }, { status: 400 })
      }

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('❌ Supabase credentials not configured')
        return NextResponse.json({ success: false, error: 'Storage not configured' }, { status: 500 })
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      console.log('📥 Downloading file from storage:', path)
      const { data, error } = await supabase.storage.from(BUCKET).download(path)
      
      if (error || !data) {
        console.log('❌ Failed to download from storage:', error?.message)
        return NextResponse.json({ 
          success: false, 
          error: error?.message || 'download failed' 
        }, { status: 500 })
      }

      const ab = await data.arrayBuffer()
      const bytes = new Uint8Array(ab)
      console.log('📄 File downloaded, size:', bytes.length)
      
      const { text, meta } = await extractText({ arrayBuffer: () => ab } as File, path)
      console.log('📝 Text extracted, length:', text.length)
      
      const { summary, suggestions } = await summarizeAndSuggest(text, path)
      console.log('🤖 Summary generated, suggestions:', suggestions.length)

      // Save to database
      try {
        await supabase.from('document_analyses').insert({
          building_id: buildingId, 
          filename: path.split('/').pop(), 
          mime_type: 'application/octet-stream', 
          size_bytes: bytes.length,
          summary, 
          source: 'ask-blociq'
        })
        console.log('💾 Document analysis saved to database')
      } catch (dbError) {
        console.warn('⚠️ Failed to store document analysis:', dbError)
        // Don't fail the request if this fails
      }

      console.log('✅ Large file processing completed successfully')
      return NextResponse.json({
        success: true,
        filename: path.split('/').pop(),
        bytes: bytes.length,
        buildingId,
        summary: summary,
        suggestedActions: suggestions ?? [],
        textExcerpt: text.slice(0, 4000),
      })
    }

    console.log('❌ Unsupported content-type:', contentType)
    return NextResponse.json(
      { success: false, error: `Unsupported content-type: ${contentType}` },
      { status: 415 }
    )
  } catch (e: any) {
    const msg = e?.message || 'Unexpected error'
    console.error('❌ ask-ai upload error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
