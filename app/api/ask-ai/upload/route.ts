import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/ask/text'

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const routeId = 'app/api/ask-ai/upload/route.ts'
  
  try {
    const formData = await request.formData()
    const files = formData.getAll('file') as File[]
    const buildingId = formData.get('building_id') as string
    const docType = formData.get('doc_type') as string || null
    
    if (!buildingId) {
      return NextResponse.json({
        ok: false,
        error: 'building_id is required',
        uploaded: [],
        errors: [],
        routeId
      })
    }
    
    if (files.length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'No files provided',
        uploaded: [],
        errors: [],
        routeId
      })
    }
    
    let admin
    try {
      admin = createAdminClient()
    } catch (error) {
      return NextResponse.json({
        ok: false,
        errors: [{ message: 'service_role_missing' }],
        uploaded: [],
        routeId
      })
    }
    
    const uploaded = []
    const errors = []
    
    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const timestamp = Date.now()
        const fileName = slugify(file.name)
        const storagePath = `${buildingId}/${timestamp}-${fileName}`
        
        // Upload to Supabase Storage
        const { error: uploadError } = await admin.storage
          .from('building-docs')
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false
          })
        
        if (uploadError) {
          errors.push({ 
            file: file.name, 
            message: `Storage upload failed: ${uploadError.message}` 
          })
          continue
        }
        
        // Extract text content based on file type
        let textContent = ''
        if (file.type.startsWith('application/pdf')) {
          // For PDFs, we'll leave text_content empty for now
          // You can integrate with lib/extractTextFromPdf if available
          textContent = ''
        } else if (file.type.startsWith('text/')) {
          textContent = buffer.toString('utf8')
        }
        
        // Insert into building_documents table
        const { data: docData, error: insertError } = await admin
          .from('building_documents')
          .insert({
            building_id: buildingId,
            file_name: file.name,
            type: docType,
            storage_path: storagePath,
            mime_type: file.type,
            size_bytes: file.size,
            text_content: textContent
          })
          .select('id')
          .single()
        
        if (insertError) {
          errors.push({ 
            file: file.name, 
            message: `Database insert failed: ${insertError.message}` 
          })
          continue
        }
        
        uploaded.push({
          id: docData.id,
          file_name: file.name,
          storage_path: storagePath,
          bytes: file.size,
          mime_type: file.type
        })
        
      } catch (error) {
        errors.push({ 
          file: file.name, 
          message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        })
      }
    }
    
    return NextResponse.json({
      ok: uploaded.length > 0,
      uploaded,
      errors,
      routeId
    })
    
  } catch (error) {
    console.error('Error in upload route:', error)
    return NextResponse.json({
      ok: false,
      error: 'Internal server error',
      uploaded: [],
      errors: [],
      routeId
    })
  }
}
