// lib/extractTextFromPdf.ts
export async function extractTextFromPdf(file: File): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/es5/build/pdf"); // modern ES fallback
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + "\n";
  }

  return text;
}
