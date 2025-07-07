// app/api/extract-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";

export async function POST(req: NextRequest) {
  const { fileUrl } = await req.json();

  if (!fileUrl) {
    return NextResponse.json({ error: "Missing file URL" }, { status: 400 });
  }

  try {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParser();

    const text = await new Promise<string>((resolve, reject) => {
      parser.on("pdfParser_dataError", err => reject(err.parserError));
      parser.on("pdfParser_dataReady", pdfData => {
        const pages = pdfData?.formImage?.Pages || [];
        const allText = pages
          .flatMap(page => page.Texts.map(t => decodeURIComponent(t.R[0].T)))
          .join(" ");
        resolve(allText);
      });
      parser.parseBuffer(buffer);
    });

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("❌ PDF2JSON parse error:", err);
    return NextResponse.json({ error: err?.message || "Failed to extract PDF text" }, { status: 500 });
  }
}
