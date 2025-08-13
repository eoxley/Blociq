import { NextResponse } from 'next/server';
import { extractBuildingId } from '@/lib/extract-building-id';
import { extractText } from '@/lib/extract-text';
import { summarizeAndSuggest } from '@/lib/ask/summarize-and-suggest';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export async function POST(req: Request, ctx: { params?: { buildingId?: string } }) {
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ success: false, error: 'multipart/form-data required' }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ success: false, error: 'file is required' }, { status: 400 });
  }

  let buildingId = await extractBuildingId(req, ctx?.params);
  let buildingStatus: 'matched' | 'not_found' | 'missing' = 'missing';

  if (buildingId && supabase) {
    const { data, error } = await supabase.from('buildings').select('id').eq('id', buildingId).maybeSingle();
    if (error || !data) { buildingStatus = 'not_found'; buildingId = null; } else { buildingStatus = 'matched'; }
  } else if (buildingId && !supabase) {
    // Can't verify; treat as missing and proceed
    buildingStatus = 'missing';
    buildingId = null;
  }

  const { text, meta } = await extractText(file);
  const { summary, suggestions } = await summarizeAndSuggest(text, meta.name);
  const textExcerpt = text.slice(0, 4000);

  if (supabase) {
    await supabase.from('document_analyses').insert({
      building_id: buildingId, filename: meta.name, mime_type: meta.type, size_bytes: meta.bytes,
      summary, source: 'ask-blociq'
    }).throwOnError();
  }

  return NextResponse.json({
    success: true,
    summary,
    suggestedActions: suggestions,
    textExcerpt,
    context: { buildingId, buildingStatus, filename: meta.name, bytes: meta.bytes, mime: meta.type }
  });
}
