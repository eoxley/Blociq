import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { extractText } from "../lib/extract-text";

const router = Router();

// Health check endpoint
router.get("/ocr/health", (_req, res) => {
  console.log('🏥 Health check requested');
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Main OCR processing endpoint
router.post("/ocr/process", async (req, res) => {
  try {
    console.log('🎯 OCR process request received');
    
    // Authenticate request
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token || token !== process.env.RENDER_OCR_TOKEN) {
      console.error('❌ Unauthorized OCR request');
      return res.status(401).json({ success: false, detail: "unauthorised" });
    }

    const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "building_documents";
    const { storageKey, filename, mime = "application/pdf", buildingId, unitId, agencyId } = req.body || {};
    
    console.log('📥 OCR request details:', {
      storageKey,
      filename,
      mime,
      bucket: BUCKET
    });
    
    if (!storageKey) {
      console.error('❌ Missing storageKey in request');
      return res.status(400).json({ success: false, detail: "missing storageKey" });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Normalize storageKey: should be object key only (no bucket prefix)
    const objectKey = storageKey.startsWith(`${BUCKET}/`) ? storageKey.slice(BUCKET.length + 1) : storageKey;
    console.log('🔑 Using objectKey:', objectKey);

    // Download file from Supabase
    console.log('📥 Downloading from Supabase bucket:', BUCKET);
    const { data, error } = await supabase.storage.from(BUCKET).download(objectKey);
    
    if (error || !data) {
      console.error('❌ Supabase download failed:', error?.message);
      return res.status(400).json({ 
        success: false, 
        detail: `supabase download failed: ${error?.message || "unknown"}` 
      });
    }

    // Convert to buffer
    const buffer = Buffer.from(await data.arrayBuffer());
    if (!buffer.length) {
      console.error('❌ Empty buffer received');
      return res.status(400).json({ success: false, detail: "empty buffer" });
    }

    console.info("OCR input bytes:", buffer.length, "mime:", mime);

    // Process with OCR pipeline
    console.log('🔄 Starting OCR processing...');
    const { text, source } = await extractText(buffer, mime);
    const textLength = text?.length || 0;
    
    console.log('✅ OCR processing completed:', {
      source,
      textLength,
      success: !!textLength
    });

    // Return results
    return res.json({
      success: !!textLength,
      source,
      textLength,
      filename,
      storageKey,
      buildingId, 
      unitId, 
      agencyId,
      extractedText: text // Include extracted text for compatibility
    });
    
  } catch (e: any) {
    console.error('❌ OCR processing error:', e?.message || e);
    return res.status(500).json({ 
      success: false, 
      detail: e?.message || "server error" 
    });
  }
});

export default router;