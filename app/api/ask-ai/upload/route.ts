export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { processFileWithOCR } from "@/lib/ai/ocrClient";

const MIN = 50; // characters required to call it "text"

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return Response.json({ success:false, message:'Use form-data with field "file"' }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ success:false, message:"No file uploaded." }, { status: 400 });
  }

  // ALWAYS call your external OCR service
  let ocrResult;
  try {
    ocrResult = await processFileWithOCR(file); // hits https://ocr-server-2-ykmk.onrender.com/upload
  } catch (e: any) {
    return Response.json({ success:false, message:`OCR error: ${e?.message || "failed"}` }, { status: 200 });
  }

  if (!ocrResult.success || !ocrResult.text) {
    return Response.json({ 
      success: false, 
      message: ocrResult.error?.message || "OCR processing failed",
      filename: file.name,
      usedOCR: true,
      textLength: 0
    }, { status: 200 });
  }

  const textLength = (ocrResult.text || "").trim().length;
  if (textLength < MIN) {
    return Response.json({
      success: false,
      filename: file.name,
      usedOCR: true,
      textLength,
      message: "Document processing failed - insufficient text extracted."
    }, { status: 200 });
  }

  return Response.json({
    success: true,
    filename: file.name,
    usedOCR: true,
    textLength,
    text: ocrResult.text // <- the raw OCR text for your UI
  });
}
