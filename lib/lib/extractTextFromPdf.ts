import { getDocument } from "pdfjs-dist/legacy/build/pdf";

export async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;

  const text: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: Record<string, unknown>) =>
      "str" in item ? item.str : ""
    );
    text.push(pageText.join(" "));
  }

  return text.join("\n");
}
