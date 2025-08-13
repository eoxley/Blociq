import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { JSDOM } from 'jsdom';

export async function extractText(file: File): Promise<{ text: string, meta: { name: string, type: string, bytes: number } }> {
  const arr = await file.arrayBuffer();
  const buf = Buffer.from(arr);
  const name = file.name;
  const type = file.type || guessType(name);
  let text = '';

  if (type.includes('pdf') || name.toLowerCase().endsWith('.pdf')) {
    const res = await pdfParse(buf);
    text = res.text || '';
  } else if (type.includes('word') || name.toLowerCase().endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    text = value || '';
  } else if (
    type.includes('text') ||
    name.endsWith('.txt') ||
    name.endsWith('.csv') ||
    name.endsWith('.md')
  ) {
    text = buf.toString('utf-8');
  } else if (type.includes('html') || name.endsWith('.html') || name.endsWith('.htm')) {
    const dom = new JSDOM(buf.toString('utf-8'));
    text = dom.window.document.body.textContent || '';
  } else {
    // Best-effort fallback
    text = buf.toString('utf-8');
    if (!/\w/.test(text)) text = '[Binary or unsupported file format; extracted minimal text]';
  }

  const MAX = 200_000;
  if (text.length > MAX) {
    text = text.slice(0, MAX) + `\n\n[Truncated to ${MAX} chars]`;
  }

  return { text, meta: { name, type, bytes: buf.byteLength } };
}

function guessType(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  return 'application/octet-stream';
}
