export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal, explicit uploader that *always* calls your external OCR via multipart
const MIN = 200; // allow modest docs; raise later if you like

function getOrigin(req: Request) {
  const h = (k: string) => req.headers.get(k) || "";
  const proto = h("x-forwarded-proto");
  const host = h("x-forwarded-host") || h("host");
  return process.env.NEXT_PUBLIC_BASE_URL || (proto && host ? `${proto}://${host}` : new URL(req.url).origin);
}

async function callExternalOCR(bytes: Uint8Array, engine?: string) {
  const urlBase = process.env.OCR_SERVICE_URL!; // e.g. https://ocr-server.../upload
  const url = engine ? `${urlBase}?engine=${encodeURIComponent(engine)}` : urlBase;
  const token = process.env.OCR_TOKEN || "";

  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: "application/pdf" }), "upload.pdf");

  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });

  const meta = { status: res.status, url, ok: res.ok };
  if (!res.ok) return { text: "", meta };

  const j = await res.json().catch(() => ({} as any));

  // Accept a bunch of likely shapes
  const cands = [
    j?.text, j?.result?.text, j?.data?.text,
    j?.fullTextAnnotation?.text, j?.result?.fullTextAnnotation?.text,
    j?.ParsedResults?.[0]?.ParsedText, j?.ocr?.text,
  ].filter((s: any) => typeof s === "string");

  const text = (cands[0] as string) || "";
  return { text, meta };
}

export async function POST(req: Request) {
  // ---- parse file ----
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ success:false, message:"No file" }, { status:400 });
  const bytes = new Uint8Array(await file.arrayBuffer());

  const started = Date.now();
  let source: "external" | "external-vision" | "local" | "none" = "none";

  // ---- 1) External OCR (default engine) ----
  let { text, meta } = await callExternalOCR(bytes);
  if ((text || "").trim().length >= MIN) source = "external";

  // ---- 2) If short, try explicit Vision engine (if your server supports it) ----
  if (source === "none") {
    const r2 = await callExternalOCR(bytes, "vision");
    if ((r2.text || "").trim().length >= MIN) { text = r2.text; meta = r2.meta; source = "external-vision"; }
  }

  // ---- 3) Local fallback (/api/ocr proxy) ----
  if (source === "none") {
    try {
      const res = await fetch(`${getOrigin(req)}/api/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: bytes,
      });
      if (res.ok) {
        const j = await res.json().catch(() => ({} as any));
        const cands = [
          j?.text, j?.result?.text, j?.data?.text,
          j?.fullTextAnnotation?.text, j?.ParsedResults?.[0]?.ParsedText,
        ].filter((s: any) => typeof s === "string");
        const t = (cands[0] as string) || "";
        if (t.trim().length >= MIN) { text = t; source = "local"; }
      }
    } catch {}
  }

  const ms = Date.now() - started;
  const len = (text || "").trim().length;
  const headers = new Headers({
    "X-OCR-Source": source,
    "X-OCR-Duration": String(ms),
    "X-OCR-URL": meta?.url ?? "",
    "X-OCR-HTTP": String(meta?.status ?? ""),
  });

  if (len < MIN) {
    return new Response(JSON.stringify({
      success: false,
      filename: file.name,
      ocrSource: source,
      textLength: len,
      summary: "Document processing failed - insufficient text extracted.",
      extractedText: "",
    }), { status: 200, headers });
  }

  return new Response(JSON.stringify({
    success: true,
    filename: file.name,
    ocrSource: source,
    textLength: len,
    text,
    extractedText: text,
  }), { status: 200, headers });
}
