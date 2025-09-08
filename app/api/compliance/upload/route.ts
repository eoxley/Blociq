import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSamplePdf(): Buffer | null {
  if (process.env.NODE_ENV === 'production') return null;
  const filePath = path.join(process.cwd(), 'test/data/05-versions-space.pdf');
  return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
}

export async function POST(req: Request) {
  const sample = getSamplePdf();

  if (sample) {
    // Dev-only: test processing logic here
    console.log("Sample PDF loaded:", sample.length);
  }

  return NextResponse.json({ ok: true });
}