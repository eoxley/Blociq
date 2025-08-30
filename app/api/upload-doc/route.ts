// ✅ AUDIT COMPLETE [2025-01-15]
// - Has try/catch wrapper
// - Validates required fields (file, building_id)
// - Validates file size and type
// - Uses proper Supabase queries with .eq() filters
// - Returns meaningful error responses
// - Includes authentication check

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const buildingId = formData.get('building_id') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload PDF, DOC, DOCX, JPG, or PNG files' 
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = new Date().getTime()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${file.name}`
    const filePath = `document_uploads/${buildingId}/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('document_uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('document_uploads')
      .getPublicUrl(filePath)

    // Extract text from file (simplified - in production you'd use proper OCR/text extraction)
    let extractedText = ''
    let documentType = 'Unknown'
    let confidence = 0.8

    try {
      // For now, we'll use a simple approach. In production, you'd use:
      // - PDF.js for PDFs
      // - OCR services for images
      // - Office document parsers for Word docs
      
      if (file.type === 'application/pdf') {
        // For PDFs, we'd normally use PDF.js or a service like pdf-parse
        extractedText = `PDF document: ${file.name}`
        documentType = 'PDF Document'
      } else if (file.type.includes('word')) {
        extractedText = `Word document: ${file.name}`
        documentType = 'Word Document'
      } else if (file.type.includes('image')) {
        extractedText = `Image document: ${file.name}`
        documentType = 'Image Document'
      }

      // Use OpenAI to classify document type if we have text content
      if (extractedText) {
        const classificationResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a document classification expert. Analyze the document and classify it into one of these categories:
              - Fire Risk Assessment
              - Electrical Installation Certificate (EICR)
              - Insurance Certificate
              - Gas Safety Certificate
              - Asbestos Survey
              - Building Regulations Certificate
              - Planning Permission
              - Energy Performance Certificate (EPC)
              - Maintenance Report
              - Lease Agreement
              - Other
              
              Respond with only the category name.`
            },
            {
              role: 'user',
              content: `Classify this document: ${file.name}`
            }
          ],
          max_tokens: 50,
          temperature: 0.1
        })

        const classifiedType = classificationResponse.choices[0]?.message?.content?.trim()
        if (classifiedType && classifiedType !== 'Other') {
          documentType = classifiedType
          confidence = 0.9
        }
      }

    } catch (error) {
      console.error('Text extraction error:', error)
      // Continue with basic classification
    }

    // Save document record to database
    const { data: documentData, error: dbError } = await supabase
      .from('building_documents')
      .insert({
        building_id: buildingId,
        file_name: file.name,
        file_url: publicUrl,
        file_path: filePath,
        file_size: file.size,
        document_type: documentType,
        extracted_text: extractedText,
        confidence: confidence,
        status: 'uploaded',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      document_type: documentType,
      confidence: confidence,
      data: documentData
    })

  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 