import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = process.env.DOCS_BUCKET || 'documents'

export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json().catch(() => ({}))
    
    if (!filename || !contentType) {
      console.log('❌ Missing filename or contentType in request')
      return NextResponse.json({ 
        success: false,
        error: 'filename and contentType required' 
      }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('❌ Supabase credentials not configured')
      return NextResponse.json({ 
        success: false,
        error: 'Storage not configured' 
      }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Create a unique path for the file
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const path = `ask-ai/${timestamp}-${sanitizedFilename}`

    console.log('🔐 Creating signed upload URL for:', path)

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path)

    if (error || !data?.signedUrl) {
      console.log('❌ Failed to create signed URL:', error?.message)
      return NextResponse.json({ 
        success: false,
        error: error?.message || 'Could not create signed URL' 
      }, { status: 500 })
    }

    console.log('✅ Signed upload URL created successfully')
    return NextResponse.json({ 
      success: true,
      signedUrl: data.signedUrl, 
      path, 
      bucket: BUCKET 
    })
  } catch (e: any) {
    const msg = e?.message || 'Unexpected error'
    console.error('❌ Signed upload URL error:', msg)
    return NextResponse.json({ 
      success: false, 
      error: msg 
    }, { status: 500 })
  }
}
