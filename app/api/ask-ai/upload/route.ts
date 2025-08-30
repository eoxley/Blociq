export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { processFileWithOCR } from '@/lib/ai/ocrClient'

const MIN = 500 // leases should crush this; forces real results

function getOrigin(req: Request) {
  const h = (k: string) => req.headers.get(k) || "";
  const xfProto = h("x-forwarded-proto");
  const host = h("x-forwarded-host") || h("host");
  return process.env.NEXT_PUBLIC_BASE_URL || (xfProto && host ? `${xfProto}://${host}` : new URL(req.url).origin);
}

async function ocrWithFallback(file: File, req: Request) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const started = Date.now();
  let text = "", source: "external" | "local" | "none" = "none";
  
  // 1) External OCR (2 tries)
  for (let i = 0; i < 2 && (!text || text.trim().length < MIN); i++) {
    try {
      const t = await processFileWithOCR(bytes);
      if (t?.trim()) { 
        text = t; 
        source = "external"; 
      }
    } catch (e: any) {
      console.log(`⚠️ External OCR attempt ${i + 1} failed:`, e?.message || 'unknown error')
    }
  }
  
  // 2) Local fallback (/api/ocr) — must not return a placeholder!
  if (!text || text.trim().length < MIN) {
    try {
      const res = await fetch(`${getOrigin(req)}/api/ocr`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/pdf' }, 
        body: bytes,
      });
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        const t = j?.text ?? j?.result?.text ?? j?.data?.text ?? "";
        if (t?.trim()) { 
          text = t; 
          source = 'local'; 
        }
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
        summary: "Document processing failed - insufficient text extracted.",
        extractedText: "",
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({
      success: true,
      filename: file.name,
      ocrSource: used,
      textLength: text.length,
      text,               // raw OCR text for UI
      extractedText: text // keep both keys to satisfy existing UI
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
