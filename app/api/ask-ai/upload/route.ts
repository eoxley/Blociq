export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { processBytesWithOCR } from '@/lib/ai/ocrClient'

// Helper function to get origin from request
function getOrigin(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

const MIN = 50 // chars to count as "real text"

async function ocrWithFallback(file: File, req: Request) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const started = Date.now();
  let source: "external" | "local" | "none" = "none";
  let text = "";
  
  // 1) External OCR (Render) with retry
  for (let i = 0; i < 2; i++) {
    try {
      const t = await processBytesWithOCR(bytes);
      if (t?.trim()) { 
        text = t; 
        source = "external"; 
        break;
      }
    } catch (e: any) {
      console.log(`⚠️ External OCR attempt ${i + 1} failed:`, e?.message || 'unknown error')
    }
    // small backoff
    if (i < 1) await new Promise(r => setTimeout(r, 600))
  }

  // 2) Local fallback (/api/ocr) - if you have one
  if (!text?.trim()) {
    const origin = getOrigin(req);
    try {
      const r = await fetch(`${origin}/api/ocr`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/pdf' }, 
        body: bytes,
      });
      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        text = j?.text ?? j?.result?.text ?? j?.data?.text ?? "";
        if (text?.trim()) source = 'local';
      }
    } catch (e: any) {
      console.log('⚠️ Local OCR fallback failed:', e?.message || 'unknown error')
    }
  }
  
  const ms = Date.now() - started;
  console.info("[upload] file=%s len=%d src=%s ms=%d", file.name, (text||"").length, source, ms);
  
  return { text, used: source, duration: ms }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    
    if (!(file instanceof File)) {
      return Response.json({ 
        success: false, 
        message: 'No file uploaded.' 
      }, { status: 400 })
    }

    const { text, used, duration } = await ocrWithFallback(file, req)
    const textLength = (text || '').trim().length

    // Add response headers for instrumentation
    const headers = new Headers({ 
      "X-OCR-Source": used, 
      "X-OCR-Duration": String(duration) 
    });

    if (textLength < MIN) {
      return new Response(JSON.stringify({
        success: false,
        filename: file.name,
        ocrSource: used,
        textLength: (text || "").length,
        summary: "Document processing failed - insufficient text extracted."
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({
      success: true,
      filename: file.name,
      ocrSource: used,
      textLength: text.length,
      text,
      extractedText: text
    }), { status: 200, headers });
  } catch (error: any) {
    console.error('❌ OCR upload error:', error)
    return Response.json({
      success: false,
      message: `Upload failed: ${error?.message || 'Unknown error'}`,
      textLength: 0,
      usedOCR: false,
      source: 'none'
    }, { status: 500 })
  }
}
