export const runtime = 'nodejs'
export const config = { api: { bodyParser: false } }

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Read raw binary data
    const bytes = await req.arrayBuffer()
    
    if (!bytes || bytes.byteLength === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file data received' 
      }, { status: 400 })
    }

    // Convert to Uint8Array for processing
    const uint8Array = new Uint8Array(bytes)
    
    // For now, return a simple response indicating local OCR is available
    // In a real implementation, you would integrate with a local OCR library
    // like Tesseract.js, pdf-parse, or similar
    
    return NextResponse.json({
      success: true,
      text: `[Local OCR] PDF received with ${uint8Array.length} bytes. Local OCR processing not yet implemented.`,
      source: 'local',
      fileSize: uint8Array.length
    })
    
  } catch (error: any) {
    console.error('❌ Local OCR error:', error)
    return NextResponse.json({
      success: false,
      error: `Local OCR failed: ${error?.message || 'Unknown error'}`
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
