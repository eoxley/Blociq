// OCR Comparison Test Endpoint
// Tests multiple OCR methods and returns detailed comparison

import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 300; // 5 minutes for comprehensive testing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    const supabase = createServerComponentClient({ cookies })
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`🧪 Starting OCR comparison test for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const results: any[] = []
    
    // Method 1: PDF Text Layer Extraction
    console.log('🔍 Testing Method 1: PDF Text Layer...')
    try {
      const startTime = Date.now()
      const { extractPdfText } = await import('@/lib/pdf-parse-wrapper')
      const text = await extractPdfText(buffer)
      const duration = Date.now() - startTime
      
      results.push({
        method: 'PDF Text Layer',
        success: true,
        textLength: text.length,
        wordCount: text.trim().split(/\s+/).length,
        duration: duration,
        preview: text.substring(0, 200) + '...',
        hasPropertyTerms: /\b(lease|property|building|flat|apartment|close|road|street)\b/i.test(text),
        score: text.length > 1000 ? 'high' : text.length > 100 ? 'medium' : 'low'
      })
    } catch (error) {
      results.push({
        method: 'PDF Text Layer',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: 0,
        duration: 0
      })
    }
    
    // Method 2: OpenAI File Extraction
    console.log('🔍 Testing Method 2: OpenAI File Extraction...')
    try {
      const startTime = Date.now()
      const response = await openai.files.create({
        file: new Blob([buffer], { type: 'application/pdf' }),
        purpose: 'assistants',
      })
      
      const content = await openai.files.content(response.id)
      const text = await content.text()
      
      // Clean up
      await openai.files.delete(response.id)
      
      const duration = Date.now() - startTime
      
      results.push({
        method: 'OpenAI File Extraction',
        success: true,
        textLength: text.length,
        wordCount: text.trim().split(/\s+/).length,
        duration: duration,
        preview: text.substring(0, 200) + '...',
        hasPropertyTerms: /\b(lease|property|building|flat|apartment|close|road|street)\b/i.test(text),
        score: text.length > 1000 ? 'high' : text.length > 100 ? 'medium' : 'low'
      })
    } catch (error) {
      results.push({
        method: 'OpenAI File Extraction',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: 0,
        duration: 0
      })
    }
    
    // Method 3: Google Vision OCR Fallback
    console.log('🔍 Testing Method 3: Google Vision OCR...')
    try {
      const startTime = Date.now()
      const { ocrFallback } = await import('@/lib/compliance/docExtract')
      const text = await ocrFallback(file.name, buffer)
      const duration = Date.now() - startTime
      
      results.push({
        method: 'Google Vision OCR',
        success: true,
        textLength: text.length,
        wordCount: text.trim().split(/\s+/).length,
        duration: duration,
        preview: text.substring(0, 200) + '...',
        hasPropertyTerms: /\b(lease|property|building|flat|apartment|close|road|street)\b/i.test(text),
        score: text.length > 1000 ? 'high' : text.length > 100 ? 'medium' : 'low'
      })
    } catch (error) {
      results.push({
        method: 'Google Vision OCR',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: 0,
        duration: 0
      })
    }
    
    // Method 4: Enhanced Google Vision
    console.log('🔍 Testing Method 4: Enhanced Google Vision...')
    try {
      const startTime = Date.now()
      const { extractWithGoogleVision } = await import('@/lib/extract-text')
      const result = await extractWithGoogleVision(file)
      const duration = Date.now() - startTime
      
      results.push({
        method: 'Enhanced Google Vision',
        success: true,
        textLength: result.textLength,
        wordCount: result.extractedText.trim().split(/\s+/).length,
        duration: duration,
        preview: result.extractedText.substring(0, 200) + '...',
        hasPropertyTerms: /\b(lease|property|building|flat|apartment|close|road|street)\b/i.test(result.extractedText),
        source: result.source,
        confidence: result.confidence,
        score: result.textLength > 1000 ? 'high' : result.textLength > 100 ? 'medium' : 'low'
      })
    } catch (error) {
      results.push({
        method: 'Enhanced Google Vision',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: 0,
        duration: 0
      })
    }
    
    // Calculate overall stats
    const successfulResults = results.filter(r => r.success)
    const bestResult = successfulResults.reduce((best, current) => 
      current.textLength > best.textLength ? current : best, 
      { textLength: 0 }
    )
    
    console.log(`✅ OCR comparison complete. Best method: ${bestResult.method || 'None'} (${bestResult.textLength} chars)`)
    
    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
      results: results,
      summary: {
        totalMethods: results.length,
        successfulMethods: successfulResults.length,
        bestMethod: bestResult.method || 'None',
        bestTextLength: bestResult.textLength || 0,
        recommendation: bestResult.textLength > 1000 ? 
          `Use ${bestResult.method} - excellent extraction` :
          bestResult.textLength > 100 ?
          `Use ${bestResult.method} - moderate extraction, consider document quality` :
          'Document may be heavily scanned or corrupted - manual review needed'
      }
    })

  } catch (error) {
    console.error('❌ Error in OCR comparison test:', error)
    return NextResponse.json(
      { error: 'Failed to run OCR comparison test. Please try again.' },
      { status: 500 }
    )
  }
}
