import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies())
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const buildingId = formData.get('building_id') as string
    const category = formData.get('category') as string

    if (!file || !buildingId || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `buildings/${buildingId}/documents/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Save document metadata to database
    const { data: document, error: dbError } = await supabase
      .from('building_documents')
      .insert({
        building_id: buildingId,
        name: file.name,
        type: file.type,
        category: category,
        file_path: filePath,
        file_size: file.size,
        uploaded_by: user.email || 'Unknown',
        ocr_status: 'pending'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save document metadata' }, { status: 500 })
    }

    // Trigger OCR processing (async)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/documents/process-ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id })
      })
    } catch (ocrError) {
      console.error('OCR trigger error:', ocrError)
      // Don't fail the upload if OCR fails
    }

    return NextResponse.json({ 
      success: true, 
      document: {
        id: document.id,
        name: document.name,
        type: document.type,
        category: document.category,
        file_path: document.file_path,
        file_size: document.file_size,
        uploaded_at: document.uploaded_at,
        uploaded_by: document.uploaded_by,
        ocr_status: document.ocr_status
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
