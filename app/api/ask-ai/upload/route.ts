export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { processFileWithOCRService, getRecommendedOCRConfig } from '@/lib/ocrService'

const MIN = 200; // minimum text length

export async function POST(req: Request) {
  // ---- parse file ----
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ success:false, message:"No file" }, { status:400 });

  const started = Date.now();
  
  try {
    console.log(`🔍 Processing upload: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Get recommended OCR configuration for this file type
    const ocrConfig = getRecommendedOCRConfig(file);
    
    // Process file through comprehensive OCR service
    const ocrResult = await processFileWithOCRService(file, ocrConfig);
    
    const ms = Date.now() - started;
    const len = (ocrResult.text || "").trim().length;
    
    // Map OCR service source to legacy format for compatibility
    const legacySource = ocrResult.source === 'google-vision' ? 'google-vision' : 
                        ocrResult.source === 'external' ? 'external' :
                        ocrResult.source === 'local' ? 'local' : 'none';

    const headers = new Headers({
      "X-OCR-Source": legacySource,
      "X-OCR-Duration": String(ms),
      "X-OCR-URL": process.env.OCR_SERVICE_URL || "",
      "X-OCR-HTTP": ocrResult.success ? "200" : "500",
      "X-OCR-Attempts": String(ocrResult.metadata?.attempts || 0),
      "X-OCR-Service": "comprehensive"
    });

    if (!ocrResult.success || len < MIN) {
      console.log(`❌ OCR processing failed or insufficient text: ${len} characters (min: ${MIN})`);
      
      return new Response(JSON.stringify({
        success: false,
        filename: file.name,
        ocrSource: legacySource,
        textLength: len,
        summary: ocrResult.error || "Document processing failed - insufficient text extracted.",
        extractedText: ocrResult.text || "",
        error: ocrResult.error,
        processingTime: ms
      }), { status: 200, headers });
    }

    console.log(`✅ OCR processing successful: ${len} characters extracted via ${ocrResult.source}`);

    return new Response(JSON.stringify({
      success: true,
      filename: file.name,
      ocrSource: legacySource,
      textLength: len,
      text: ocrResult.text,
      extractedText: ocrResult.text,
      confidence: ocrResult.confidence,
      processingTime: ms,
      source: ocrResult.source
    }), { status: 200, headers });

  } catch (error) {
    const ms = Date.now() - started;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Upload processing error for ${file.name}:`, error);
    
    const headers = new Headers({
      "X-OCR-Source": "none",
      "X-OCR-Duration": String(ms),
      "X-OCR-URL": "",
      "X-OCR-HTTP": "500",
      "X-OCR-Service": "comprehensive"
    });

    return new Response(JSON.stringify({
      success: false,
      filename: file.name,
      ocrSource: "none",
      textLength: 0,
      summary: `Upload processing failed: ${errorMessage}`,
      extractedText: "",
      error: errorMessage,
      processingTime: ms
    }), { status: 500, headers });
  }
}
