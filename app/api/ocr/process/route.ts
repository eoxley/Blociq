import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const token = process.env.RENDER_OCR_TOKEN;
    const ocrUrl = process.env.RENDER_OCR_URL;
    
    if (!token || !ocrUrl) {
      return NextResponse.json({
        success: false,
        reason: 'missing-render-config',
        details: 'RENDER_OCR_TOKEN and RENDER_OCR_URL must be configured'
      }, { status: 500 });
    }
    
    const contentType = req.headers.get("content-type") || "";
    let payload: any = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData (small files or with storageKey)
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const storageKey = (form.get("storageKey") as string) || "";
      
      if (!file) {
        return NextResponse.json({ 
          success: false, 
          reason: "no-file" 
        }, { status: 400 });
      }
      
      // Check if file is too large for direct processing
      const MAX_DIRECT_BYTES = 4_500_000; // Vercel safe limit
      if (file.size > MAX_DIRECT_BYTES) {
        if (!storageKey) {
          return NextResponse.json({ 
            success: false, 
            reason: "large-file-no-storageKey",
            details: `File ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds ${(MAX_DIRECT_BYTES / (1024 * 1024)).toFixed(1)} MB limit and no storageKey provided`
          }, { status: 400 });
        }
        
        // Large file: use storageKey only
        payload = { 
          storageKey, 
          filename: file.name, 
          mime: file.type || "application/pdf" 
        };
        
        console.log('📤 Routing large file via storageKey:', file.name, `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      } else {
        // Small file: can still send via storageKey for consistency
        payload = { 
          storageKey, 
          filename: file.name, 
          mime: file.type || "application/pdf" 
        };
        
        console.log('📤 Routing small file via storageKey:', file.name, `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      }
    } else {
      // Handle JSON (storageKey only)
      try {
        payload = await req.json();
      } catch (jsonError) {
        return NextResponse.json({
          success: false,
          reason: "invalid-json",
          details: "Request body is not valid JSON"
        }, { status: 400 });
      }
      
      if (!payload?.storageKey) {
        return NextResponse.json({ 
          success: false, 
          reason: "missing-storageKey",
          details: "storageKey is required in JSON requests"
        }, { status: 400 });
      }
      
      console.log('📤 Routing file via JSON storageKey:', payload.filename);
    }

    // Forward to Render OCR service
    console.log('🔄 Forwarding to Render OCR service:', ocrUrl);
    
    const renderResponse = await fetch(ocrUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify(payload),
    });

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text().catch(() => "");
      console.error('❌ Render OCR service failed:', renderResponse.status, errorText);
      
      return NextResponse.json({ 
        success: false, 
        reason: "render-ocr-failed", 
        status: renderResponse.status, 
        detail: errorText 
      }, { status: 502 });
    }

    const result = await renderResponse.json();
    
    console.log('✅ Render OCR service responded:', {
      success: result.success,
      source: result.source,
      textLength: result.textLength || 0
    });
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ OCR proxy error:', error);
    
    return NextResponse.json({
      success: false,
      reason: "proxy-error",
      details: error instanceof Error ? error.message : 'Unknown proxy error'
    }, { status: 500 });
  }
}