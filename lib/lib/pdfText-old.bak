// lib/pdfText.ts
import { getDocument } from "pdf-parse-lite";

export async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument(buffer);

  let text = "";
  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPageText(i);
    text += page + "\n";
  }

  return text;
}
