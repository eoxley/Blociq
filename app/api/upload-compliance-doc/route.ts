import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const building_id = formData.get('building_id') as string
    const asset_id = formData.get('asset_id') as string
    const file = formData.get('file') as File

    if (!file || !building_id || !asset_id) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and images are allowed.' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
    }

    const supabase = createClient(cookies())
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${asset_id}/${Date.now()}-${file.name}`
    const path = `${building_id}/${fileName}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('building-documents')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      console.error('Upload error:', error.message)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('building-documents').getPublicUrl(path)

    // Save to building_documents table
    const { error: dbError } = await supabase.from('building_documents').insert({
      building_id: parseInt(building_id, 10),
      file_name: file.name,
      file_url: urlData.publicUrl,
      type: 'Compliance',
      // Only include asset_id if the field exists in your database schema
      // asset_id: asset_id,
    })

    if (dbError) {
      console.error('Database error:', dbError.message)
      // Try to clean up the uploaded file if database insert fails
      await supabase.storage.from('building-documents').remove([path])
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      url: urlData.publicUrl,
      fileName: file.name,
      path: path
    })

  } catch (error) {
    console.error('Upload compliance doc error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 