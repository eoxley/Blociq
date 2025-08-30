export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { processFileWithOCRService } from '@/lib/ocrService'

export async function POST(req: Request) {
  const started = Date.now();
  
  try {
    // Parse form data
    const form = await req.formData();
    const file = form.get("file");
    
    if (!(file instanceof File)) {
      return Response.json({ 
        success: false, 
        message: "No file provided" 
      }, { status: 400 });
    }

    console.log(`🔍 Processing upload: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Process ALL files through our comprehensive OCR service
    // This handles text files, images, PDFs, etc. with appropriate fallbacks
    const ocrResult = await processFileWithOCRService(file, {
      preferGoogleVision: true,
      fallbackToExternal: true,
      minTextLength: 30, // Lower threshold for better success rate
      timeout: 60000 // Generous timeout for large files
    });
    
    const ms = Date.now() - started;
    const textLength = (ocrResult.text || "").trim().length;
    
    // Map internal source names to expected client format
    const ocrSource = ocrResult.source === 'google-vision' ? 'google-vision' : 
                     ocrResult.source === 'external' ? 'external' :
                     ocrResult.source === 'local' ? 'local' : 'none';

    const headers = new Headers({
      "X-OCR-Source": ocrSource,
      "X-OCR-Duration": String(ms),
      "X-OCR-Attempts": String(ocrResult.metadata?.attempts || 0),
      "X-OCR-Service": "comprehensive",
      "X-OCR-Success": String(ocrResult.success)
    });

    // Return result (success or failure)
    const responseData = {
      success: ocrResult.success,
      filename: file.name,
      ocrSource,
      textLength,
      text: ocrResult.text || "",
      extractedText: ocrResult.text || "",
      confidence: ocrResult.confidence,
      processingTime: ms,
      source: ocrResult.source
    };

    // Add error details if failed
    if (!ocrResult.success) {
      console.log(`❌ OCR failed: ${textLength} chars, source: ${ocrResult.source}, error: ${ocrResult.error}`);
      Object.assign(responseData, {
        summary: ocrResult.error || "Document processing failed",
        error: ocrResult.error
      });
    } else {
      console.log(`✅ OCR success: ${textLength} chars via ${ocrResult.source}`);
    }

    return new Response(JSON.stringify(responseData), { 
      status: 200, 
      headers 
    });

  } catch (error) {
    const ms = Date.now() - started;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Upload processing error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      filename: "unknown",
      ocrSource: "none",
      textLength: 0,
      text: "",
      extractedText: "",
      summary: `Upload processing failed: ${errorMessage}`,
      error: errorMessage,
      processingTime: ms
    }), { 
      status: 500,
      headers: new Headers({
        "X-OCR-Source": "none",
        "X-OCR-Duration": String(ms),
        "X-OCR-Service": "comprehensive",
        "X-OCR-Success": "false"
      })
    });
  }
}
