import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const fileName = `${crypto.randomUUID()}-${file.name}`;
  const path = `uploads/${fileName}`;
  const buf = Buffer.from(await file.arrayBuffer());

  await supabase.storage.from(process.env.OCR_BUCKET!).upload(path, buf, {
    contentType: file.type || 'application/pdf',
    upsert: false,
  });

  const { data: doc } = await supabase.from('documents')
    .insert({ title: file.name, file_path: path, processing_status: 'queued' })
    .select('*').single();

  return NextResponse.json({ document_id: doc.id, status: doc.processing_status });
}
