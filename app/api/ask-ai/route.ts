// app/api/ask-ai/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // Prefer service role server-side (safe in API routes only). If absent, fall back to anon.
  (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
  { auth: { persistSession: false } }
);

function parseQuery(q: string) {
  // ultra-light parser: extract unit (e.g., 5 or 5A) and a likely building name
  // Tweak if your buildings vary: add more names or pull from DB later.
  const unitMatch = q.match(/\b(?:flat|unit|apt|apartment|no\.?|#)?\s*([0-9]+[A-Za-z]?)\b/i);
  const unit = unitMatch?.[1] ?? null;

  const knownBuildings = [
    'Ashwood House',
    'Kensington Gardens Square',
    'Pimlico Place',
    'Elmington', 'Westbridge', 'Kings Court'
  ];
  const lower = q.toLowerCase();
  const building = knownBuildings.find(b => lower.includes(b.toLowerCase())) ?? null;

  // If no known building keyword, try a loose "[word] House" capture
  const generic = lower.match(/\b([a-z]+)\s+house\b/i)?.[0];
  return { unit, building: building ?? (generic ? generic.replace(/\b\w/, c => c.toUpperCase()) : null) };
}

async function lookupLeaseholder(building: string | null, unit: string | null) {
  if (!building && !unit) return null;

  // Prefer the view if present
  let { data, error } = await supabase
    .from('vw_units_leaseholders')
    .select('building_name, unit_label, leaseholder_name, leaseholder_email')
    .ilike('building_name', building ? `%${building}%` : '%')
    .ilike('unit_label', unit ? `%${unit}%` : '%')
    .limit(1);

  if (error && (error as any).message?.includes('relation') && (error as any).message?.includes('does not exist')) {
    // Fallback to base tables if the view is missing
    const { data: rows, error: err2 } = await supabase
      .from('units')
      .select(`
        unit_label,
        building:buildings(name),
        leaseholder:leaseholders(name, email)
      `)
      .ilike('unit_label', unit ? `%${unit}%` : '%')
      .limit(5);
    if (err2) throw err2;

    const match = (rows ?? []).find(r =>
      building ? (r.building as any)?.name?.toLowerCase().includes(building.toLowerCase()) : true
    );

    if (!match) return null;
    return {
      building_name: (match.building as any)?.name ?? null,
      unit_label: match.unit_label ?? null,
      leaseholder_name: (match.leaseholder as any)?.name ?? null,
      leaseholder_email: (match.leaseholder as any)?.email ?? null,
    };
  }

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    const { unit, building } = parseQuery(question);

    // 1) Try to answer directly from DB
    const ctx = await lookupLeaseholder(building, unit);

    if (ctx?.leaseholder_name) {
      const answer = `The leaseholder of ${ctx.unit_label}, ${ctx.building_name} is ${ctx.leaseholder_name}${ctx.leaseholder_email ? ` (${ctx.leaseholder_email})` : ''}.`;
      // best-effort log (ignore failures)
      try {
        await supabase.from('ai_logs').insert({
          question, response: answer, context: JSON.stringify({ building, unit, source: 'vw_units_leaseholders' })
        });
      } catch (logError) {
        // Ignore logging errors
      }
      return NextResponse.json({ answer, source: 'supabase' });
    }

    // 2) If not found, say so (don't waffle)
    const fallback =
      `I couldn't find a matching leaseholder in BlocIQ for${unit ? ` unit ${unit}` : ''}${building ? ` at ${building}` : ''}. ` +
      `Please check the unit label/building name or upload the latest leaseholder list via Onboarding.`;

    try {
      await supabase.from('ai_logs').insert({
        question, response: fallback, context: JSON.stringify({ building, unit, found: false })
      });
    } catch (logError) {
      // Ignore logging errors
    }
    return NextResponse.json({ answer: fallback, source: 'fallback' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 });
  }
} 