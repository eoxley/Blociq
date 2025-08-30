export const runtime = 'nodejs'
export const config = { api: { bodyParser: false } }

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "POST only" }, { status: 405 })
  }

  try {
    // Read raw PDF bytes
    const bytes = await req.arrayBuffer()
    
    if (!bytes || bytes.byteLength === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file data received' 
      }, { status: 400 })
    }

    // Proxy to external OCR as multipart
    const fd = new FormData()
    fd.append("file", new Blob([bytes], { type: "application/pdf" }), "upload.pdf")

    const r = await fetch(process.env.OCR_SERVICE_URL || 'https://ocr-server-2-ykmk.onrender.com/upload', {
      method: "POST",
      headers: process.env.OCR_TOKEN ? { Authorization: `Bearer ${process.env.OCR_TOKEN}` } : undefined,
      body: fd,
    })

    const j = await r.json().catch(() => ({}))
    const text = j?.text ?? j?.result?.text ?? j?.data?.text ?? ""
    
    return NextResponse.json({ 
      success: true,
      text,
      source: 'local',
      fileSize: bytes.byteLength
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
