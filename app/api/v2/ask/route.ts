import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import type { Database } from '@/types/supabase'; // if you have it; else remove and type as any
import { AI_ENABLED, OPENAI_API_KEY } from '@/lib/ai/config';

type AskAiAnswer = {
  status: 'ok'|'not_found'|'needs_clarification'|'forbidden'|'error';
  answer: string;
  data?: Record<string, any>;
  actions?: Array<{type:string,label:string,payload?:any}>;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { question = '', context = {} } = body as { question?: string; context?: any };

  const { supabase, user } = await requireAuth();

  const qRaw = String(question || '').trim();
  const q = qRaw.toLowerCase();
  const rx = (r: RegExp) => r.test(q);

  // --- SECTION 20 ---
  if (/\b(section\s*20|s20)\b/.test(q)) {
    return ok([
      'Section 20 (Landlord & Tenant Act 1985) consultation applies before:',
      '• Qualifying Works: if any leaseholder pays > £250',
      '• Long-Term Agreement: if any leaseholder pays > £100 in a year',
      'Typical flow: Stage 1 (Intention, 30 days) → Stage 2 (Estimates, 30 days) → Notice of Reasons/award.',
      'For urgent works, apply to the Tribunal to dispense with consultation.',
    ].join('\n'), 'ok', {}, [
      { type:'letter', label:'Create Stage 1 Notice', payload:{ stage:1 } },
      { type:'letter', label:'Create Stage 2 Notice', payload:{ stage:2 } },
      { type:'task',   label:'Prepare Schedule of Works' }
    ]);
  }

  // --- UNIT COUNT ---
  const mUnits = q.match(/how\s+many\s+units\s+does\s+(.+?)\s+have\??$/i);
  if (mUnits) {
    const buildingName = mUnits[1].trim();
    const b = await resolveBuilding(supabase, buildingName);
    if (!b) return ok(`I couldn't find "${buildingName}".`, 'not_found');
    const count = await getUnitCount(supabase, b.id, b.unit_count ?? null);
    return ok(`${b.name} has ${count} units.`, 'ok', { building: b, count });
  }

  // --- LEASEHOLDER LOOKUPS (name/phone/email) ---
  if (/(who\s+is\s+the\s+leaseholder|leaseholder.*(name|number|phone|email)|who\s+owns)/i.test(q)) {
    // Supports: "Flat 5 Ashwood House", "5 at Ashwood House", "5 Ashwood House"
    const m = q.match(/(?:flat|apt|apartment|no\.?|unit)?\s*([a-z0-9]+)\s+(?:at|of|in)?\s*(.+)$/i);
    if (!m) return ok('Which flat and building?', 'needs_clarification');

    const unitToken = (m[1] || '').trim();
    const buildingName = (m[2] || '').trim();

    const b = await resolveBuilding(supabase, buildingName);
    if (!b) return ok(`Building "${buildingName}" not found.`, 'not_found');

    const u = await resolveUnit(supabase, b.id, unitToken);
    if (!u) return ok(`Unit "${unitToken}" not found at ${b.name}.`, 'not_found');

    const lh = await getLeaseholderForUnit(supabase, u.id);
    if (!lh) return ok('No active leaseholder on record.', 'not_found');

    const wantsNumber = /\b(number|phone|telephone|mobile|contact)\b/.test(q);
    const wantsEmail  = /\b(email|e-mail|mail)\b/.test(q);

    let answer = `Leaseholder for Flat ${u.unit_number}, ${b.name}: ${lh.name}`;
    if (wantsEmail && lh.email)  answer += ` · Email: ${lh.email}`;
    if (wantsNumber && lh.phone) answer += ` · Phone: ${lh.phone}`;
    if (!wantsEmail && !wantsNumber) {
      if (lh.email)  answer += ` · Email: ${lh.email}`;
      if (lh.phone)  answer += ` · Phone: ${lh.phone}`;
    }

    return ok(answer, 'ok', { building: b, unit: u, leaseholder: lh });
  }

  // --- ASB GUIDANCE ---
  if (/\b(antisocial|anti-social|asb)\b/.test(q)) {
    return ok([
      'ASB plan for blocks:',
      '1) Check lease (nuisance/annoyance covenant); note specific breaches.',
      '2) Evidence: incident log, dates/times, witness statements, photos/audio if safe.',
      '3) Early action: warning letter; consider mediation.',
      '4) Escalate: formal breach notice; injunction if persistent. Criminal matters → Police/LA ASB team.',
      '5) Keep records for cost recovery/insurance.',
    ].join('\n'), 'ok', {}, [
      { type:'letter', label:'Issue Warning Letter' },
      { type:'task',   label:'Open ASB Case' }
    ]);
  }

  // --- LEAK BETWEEN FLATS ---
  if (/\bleak\b/.test(q) && /\b(apartment|flat)\b/.test(q)) {
    return ok([
      'Leak triage:',
      '• Emergency? Stopcock off; make safe; contractor out.',
      '• Source: demised (within flat) vs common parts (riser/roof/stack).',
      '• Demised: occupier/leaseholder to repair; manage neighbour impact; consider negligence.',
      '• Common parts: instruct block contractor; insurer if damage.',
      '• Always record photos, dates, areas; notify affected flats; check lease for responsibilities.',
    ].join('\n'), 'ok', {}, [
      { type:'task',   label:'Raise Leak Job' },
      { type:'letter', label:'Notify Affected Leaseholder' }
    ]);
  }

  // --- DRAFT/SUMMARY (fallback) ---
  if (/(reply|respond|draft|summary|summaris)/i.test(qRaw)) {
    const enriched = await enrichContext(supabase, user.id, context);
    const prompt = buildPromptFromContext(qRaw, enriched);
    const answer = await generateDraft(prompt);
    return ok(answer, 'ok', { usedContext: true });
  }

  // Fallback
  return ok('Can you rephrase your question?', 'needs_clarification');

  // ---------- helpers ----------
  function json(payload: AskAiAnswer, status = 200) {
    return NextResponse.json(payload, { status });
  }
  function ok(answer: string, status: AskAiAnswer['status'] = 'ok', data?: any, actions?: AskAiAnswer['actions']) {
    return json({ status, answer, data, actions });
  }

  function buildPromptFromContext(userQuestion: string, ctx: any) {
    const parts: string[] = [
      'You are BlocIQ\'s assistant for UK block management. Use British English and keep under 150 words.',
      `Task: ${userQuestion}`
    ];
    if (ctx?.email?.subject)  parts.push(`Subject: ${ctx.email.subject}`);
    if (ctx?.email?.from)     parts.push(`From: ${ctx.email.from}`);
    if (ctx?.email?.bodyText) parts.push(`Body:\n${ctx.email.bodyText}`);
    if (ctx?.thread && Array.isArray(ctx.thread)) {
      const last = ctx.thread.slice(-3).map((m: any) => `- ${m.from}: ${m.snippet || (m.bodyText || '').slice(0,140)}`).join('\n');
      parts.push(`Recent thread:\n${last}`);
    }
    if (ctx?.building?.name)  parts.push(`Building: ${ctx.building.name}`);
    if (ctx?.unit?.unit_number) parts.push(`Unit: ${ctx.unit.unit_number}`);
    if (ctx?.openTickets?.length) parts.push(`Open tickets: ${ctx.openTickets.map((t:any)=>`#${t.id} ${t.title}`).join('; ')}`);
    return parts.join('\n\n');
  }

  async function generateDraft(prompt: string) {
    if (!AI_ENABLED || !OPENAI_API_KEY) {
      return `Draft (AI off):\n\n${prompt}\n\n— Edit and send when ready.`;
    }
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role:'system', content:'You are a helpful UK property management assistant. Be concise and practical.'},
          { role:'user',   content: prompt }
        ],
        temperature: 0.4
      })
    });
    if (!r.ok) return `Draft:\n\n${prompt}\n\n(Warning: AI call failed)`;
    const j = await r.json();
    return j.choices?.[0]?.message?.content ?? `Draft:\n\n${prompt}`;
  }

  // === RESOLVERS bound to our schema ===
  async function resolveBuilding(s:any, name:string) {
    const { data, error } = await s
      .from('buildings')
      .select('id, name, unit_count')
      .ilike('name', `%${name}%`)
      .order('name', { ascending: true })
      .limit(1);
    if (error || !data?.[0]) return null;
    return data[0];
  }

  async function getUnitCount(s:any, buildingId:number, cached:number|null) {
    if (typeof cached === 'number' && !Number.isNaN(cached)) return cached;
    const { count, error } = await s
      .from('units')
      .select('id', { count:'exact', head:true })
      .eq('building_id', buildingId);
    if (error || typeof count !== 'number') return 0;
    return count;
  }

  async function resolveUnit(s:any, buildingId:number, token:string) {
    const cleaned = token.replace(/^flat\s*/i, '').replace(/^no\.?\s*/i, '').trim();
    // Prefer exact match, then ilike
    const exact = await s
      .from('units')
      .select('id, unit_number, leaseholder_id')
      .eq('building_id', buildingId)
      .eq('unit_number', cleaned)
      .limit(1);
    if (!exact.error && exact.data && exact.data[0]) return exact.data[0];

    const { data } = await s
      .from('units')
      .select('id, unit_number, leaseholder_id')
      .eq('building_id', buildingId)
      .ilike('unit_number', `%${cleaned}%`)
      .order('unit_number', { ascending: true })
      .limit(1);
    return data?.[0] ?? null;
  }

  async function getLeaseholderForUnit(s:any, unitId:number) {
    // Prefer units.leaseholder_id → leaseholders
    const { data: unitRow } = await s
      .from('units')
      .select('id, unit_number, leaseholder_id')
      .eq('id', unitId)
      .limit(1)
      .single();
    let leaseholder = null;
    if (unitRow?.leaseholder_id) {
      const { data: lh } = await s
        .from('leaseholders')
        .select('id, name, email, phone')
        .eq('id', unitRow.leaseholder_id)
        .limit(1);
      leaseholder = lh?.[0] ?? null;
    } else {
      // Fallback: leaseholders linked by unit_id (schema supports both)
      const { data: lh2 } = await s
        .from('leaseholders')
        .select('id, name, email, phone')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })
        .limit(1);
      leaseholder = lh2?.[0] ?? null;
    }
    return leaseholder;
  }

  async function enrichContext(_s:any, _userId:string, ctx:any) {
    // Minimal for now: pass through the client-provided context.
    return ctx ?? {};
  }
}
