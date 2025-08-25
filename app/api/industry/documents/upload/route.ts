import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const source = formData.get('source') as string
    const version = formData.get('version') as string
    const tags = formData.get('tags') as string

    if (!file || !title || !category || !source || !version) {
      return NextResponse.json({ 
        error: 'Missing required fields: file, title, category, source, version' 
      }, { status: 400 })
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 50MB' }, { status: 400 })
    }

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('industry-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('File upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('industry-documents')
      .getPublicUrl(fileName)

    // Parse tags
    const parsedTags = tags ? tags.split(',').map(tag => tag.trim()) : []

    // Insert document record
    const { data: document, error: insertError } = await supabase
      .from('industry_documents')
      .insert({
        title,
        category,
        source,
        version,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        tags: parsedTags,
        uploaded_by: user.id,
        status: 'uploaded'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Document insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
    }

    // Start processing the document (this would typically be done in a background job)
    // For now, we'll queue it for processing
    await supabase
      .from('industry_documents')
      .update({ 
        status: 'processing',
        processing_notes: 'Queued for AI processing'
      })
      .eq('id', document.id)

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully and queued for processing',
      data: {
        id: document.id,
        title: document.title,
        status: 'processing',
        file_url: publicUrl
      }
    })

  } catch (error) {
    console.error('Document upload API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
