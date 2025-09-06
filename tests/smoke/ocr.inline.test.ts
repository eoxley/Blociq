import { describe, it, expect } from 'vitest';
import PDFDocument from 'pdfkit';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function makeTinyPdf(text: string): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A5' });
    const chunks: Uint8Array[] = [];
    doc.fontSize(14).text(text, { align: 'left' });
    doc.end();
    doc.on('data', (c: Buffer) => chunks.push(new Uint8Array(c)));
    doc.on('end', () => resolve(Buffer.concat(chunks as any)));
  });
}

describe('OCR inline (Vision)', async () => {
  const base = process.env.OCR_BASE_URL;
  const token = process.env.OCR_AUTH_TOKEN;
  if (!base || !token) {
    it.skip('skipped: OCR_BASE_URL / OCR_AUTH_TOKEN missing', () => {});
    return;
  }

  it('returns real text from Vision', async () => {
    const body = await makeTinyPdf('Hello BlocIQ Vision OCR 12345.\nThis is a smoke test.');
    const fd = new FormData();
    const blob = new Blob([body], { type: 'application/pdf' });
    fd.append('file', blob, 'smoke.pdf');

    const res = await fetch(`${base}/upload?engine=vision&returnSample=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    expect(res.ok).toBe(true);
    const json = await res.json();
    // Diagnostics
    // console.log(JSON.stringify(json, null, 2));
    expect(json.success).toBe(true);
    expect(json.engine?.toLowerCase()).toContain('vision');
    expect(typeof json.textLength).toBe('number');
    expect(json.textLength).toBeGreaterThan(20);
    if (json.sample) {
      expect(String(json.sample).toLowerCase()).toContain('blociq');
    }
  }, 30000);
});
