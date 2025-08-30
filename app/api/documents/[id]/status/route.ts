import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: doc } = await supabase.from('documents').select('*').eq('id', id).single();
  const { data: pages } = await supabase.from('document_pages')
    .select('page_number, status, confidence').eq('document_id', id);

  return NextResponse.json({
    status: doc.processing_status,
    pages_total: doc.pages_total,
    pages_processed: doc.pages_processed,
    confidence_avg: doc.confidence_avg,
    low_conf_pages: (pages || []).filter(p => (p.confidence ?? 0) < 0.55).map(p => p.page_number),
  });
}
