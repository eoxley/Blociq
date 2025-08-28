import mammoth from "mammoth";
// import pdfParse from "pdf-parse"; // Using dynamic import to avoid test file issues

export async function extractTextFromBuffer(filename: string, mime: string|undefined, buf: Buffer): Promise<string> {
  const lower = (filename || "").toLowerCase();
  try {
    if (mime?.includes("pdf") || lower.endsWith(".pdf")) {
      // Use safe PDF parser wrapper to prevent debug mode issues
      const { safePdfParse } = await import("../../../lib/pdf-parse-wrapper");
      
      const r = await safePdfParse(buf, {
        normalizeWhitespace: false,
        disableFontFace: true,
        disableEmbeddedFonts: true,
        max: 0
      });
      
      if (r.text && r.text.trim().length > 50) return r.text;
      // fallback to OCR hook (optional)
      return r.text || "";
    }
    if (mime?.includes("word") || lower.endsWith(".docx")) {
      const r = await mammoth.extractRawText({ buffer: buf });
      return (r.value || "").trim();
    }
    // Plain text as a fallback
    return buf.toString("utf-8");
  } catch (e) {
    return "";
  }
}

/** Optional OCR hook using Google Vision; return "" if not configured */
export async function ocrFallback(_filename: string, _buf: Buffer): Promise<string> {
  // Implement if GOOGLE_APPLICATION_CREDENTIALS configured.
  // For now, return empty string to skip.
  return "";
}
