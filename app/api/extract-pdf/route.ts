import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json"; // ✅ Correct import

export async function POST(req: NextRequest) {
  try {
    const buffer = await req.arrayBuffer();
    const text = await extractTextFromPDF(Buffer.from(buffer));

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error extracting text:", error);
    return NextResponse.json(
      { error: "Failed to extract text from PDF." },
      { status: 500 }
    );
  }
}

// 🔍 Extract text using pdf2json
function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", err => reject(err.parserError));

    parser.on("pdfParser_dataReady", pdfData => {
      const pages = (pdfData as unknown as { formImage?: { Pages?: unknown[] } })?.formImage?.Pages || [];

      const allText = pages
        .flatMap((page: unknown) => {
          const pageData = page as { Texts?: Array<{ R: Array<{ T: string }> }> };
          return pageData.Texts?.map((t) => decodeURIComponent(t.R[0].T)) || [];
        })
        .join(" ");

      resolve(allText);
    });

    parser.parseBuffer(buffer);
  });
}
