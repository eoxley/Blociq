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

    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Update document status to processing
    await supabase
      .from('building_documents')
      .update({ ocr_status: 'processing' })
      .eq('id', documentId)

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('building_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (downloadError) {
      console.error('Download error:', downloadError)
      await supabase
        .from('building_documents')
        .update({ ocr_status: 'failed' })
        .eq('id', documentId)
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // Convert to buffer for OCR processing
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process with OCR (simplified - in production, use a proper OCR service)
    let ocrText = ''
    let metadata = {}

    try {
      // For now, we'll simulate OCR processing
      // In production, integrate with Google Vision API, AWS Textract, or similar
      if (document.type === 'application/pdf') {
        // Simulate PDF text extraction
        ocrText = `Extracted text from ${document.name}. This is a placeholder for actual OCR processing.`
        metadata = {
          page_count: 1,
          language: 'en',
          confidence: 0.95
        }
      } else if (document.type.startsWith('image/')) {
        // Simulate image OCR
        ocrText = `Extracted text from image ${document.name}. This is a placeholder for actual OCR processing.`
        metadata = {
          language: 'en',
          confidence: 0.90
        }
      } else {
        // For text files, read directly
        ocrText = buffer.toString('utf-8')
        metadata = {
          encoding: 'utf-8',
          line_count: ocrText.split('\n').length
        }
      }

      // Update document with OCR results
      await supabase
        .from('building_documents')
        .update({
          ocr_status: 'completed',
          ocr_text: ocrText,
          metadata: metadata
        })
        .eq('id', documentId)

      return NextResponse.json({ 
        success: true, 
        message: 'OCR processing completed',
        ocr_text: ocrText,
        metadata: metadata
      })

    } catch (ocrError) {
      console.error('OCR processing error:', ocrError)
      await supabase
        .from('building_documents')
        .update({ ocr_status: 'failed' })
        .eq('id', documentId)
      return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 })
    }

  } catch (error) {
    console.error('OCR endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}