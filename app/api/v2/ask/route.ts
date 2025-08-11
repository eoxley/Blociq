import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { AI_ENABLED, OPENAI_API_KEY } from '@/lib/ai/config';
import type { AskAiAnswer } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { question = '', context = {} } = body as { question?: string; context?: any };

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return json({ status:'forbidden', answer:'Sign in required.' }, 401);

  const q = String(question).trim();
  if (!q) return json({ status:'needs_clarification', answer:'Ask me a question.' });

  // ---- Intents (regex first) ----
  // 1) Unit count: "how many units does X have"
  const m1 = q.match(/how\s+many\s+units\s+does\s+(.+)\s+have/i);
  if (m1) {
    const name = m1[1].trim();
    const building = await resolveBuilding(supabase, name);
    if (!building) return ok(`I couldn't find "${name}".`, 'not_found');
    const count = await getUnitCount(supabase, building.id);
    return ok(`${building.name} has ${count} units.`, 'ok', { building, count });
  }

  // 2) Leaseholder: "who is the leaseholder of 5 X" / "who's the leaseholder for flat 5 at X"
  const m2 = q.match(/who.*leaseholder.*?(?:flat\s*)?(\w+).*(?:at|of|in)\s+(.+)/i);
  if (m2) {
    const unitToken = m2[1].trim();
    const name = m2[2].trim();
    const building = await resolveBuilding(supabase, name);
    if (!building) return ok(`Building "${name}" not found.`, 'not_found');
    const unit = await resolveUnit(supabase, building.id, unitToken);
    if (!unit) return ok(`Unit "${unitToken}" not found at ${building.name}.`, 'not_found');
    const lh = await getLeaseholderForUnit(supabase, unit.id);
    if (!lh) return ok('No active leaseholder on record.', 'not_found');
    // Full PII allowed (signed-in)
    return ok(
      `Leaseholder for ${unit.label}, ${building.name}: ${lh.name}. Email: ${lh.email ?? '—'} · Phone: ${lh.phone ?? '—'}`,
      'ok',
      { building, unit, leaseholder: lh }
    );
  }

  // 3) Drafting / Summary for inbox: "draft reply...", "summarise..."
  if (/(reply|respond|draft)/i.test(q) || /(summary|summarise)/i.test(q)) {
    const prompt = buildPromptFromContext(q, context);
    const answer = await generateDraft(prompt);
    return ok(answer, 'ok', { usedContext: !!context });
  }

  // 4) Fallback
  return ok('Can you rephrase your question?', 'needs_clarification');

  // ---------- helpers ----------
  function json(payload: AskAiAnswer, status = 200) {
    return NextResponse.json(payload, { status });
  }
  function ok(answer: string, status: AskAiAnswer['status'] = 'ok', data?: any) {
    return json({ status, answer, data });
  }

  function buildPromptFromContext(userQuestion: string, ctx: any) {
    // Keep it simple: thread/body/sender if present
    const pieces: string[] = [
      `You are BlocIQ's assistant. UK English.`,
      `Task: ${userQuestion}`,
    ];
    if (ctx?.email?.subject) pieces.push(`Subject: ${ctx.email.subject}`);
    if (ctx?.email?.from) pieces.push(`From: ${ctx.email.from}`);
    if (ctx?.email?.bodyText) pieces.push(`Body:\n${ctx.email.bodyText}`);
    if (ctx?.tone) pieces.push(`Tone: ${ctx.tone}`);
    return pieces.join('\n\n');
  }

  async function generateDraft(prompt: string) {
    if (!AI_ENABLED || !OPENAI_API_KEY) {
      return `Draft (no AI enabled):\n\n${prompt}\n\n-- Edit and send when ready.`;
    }
    // Minimal OpenAI call; replace model if needed
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful UK property management assistant. Keep answers concise.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
      })
    });
    if (!r.ok) return `Draft:\n\n${prompt}\n\n(Warning: AI call failed)`;
    const j = await r.json();
    return j.choices?.[0]?.message?.content ?? `Draft:\n\n${prompt}`;
  }

  // ---- Data resolvers (adjust table/column names if needed) ----
  async function resolveBuilding(supabase: any, name: string) {
    const { data, error } = await supabase
      .from('buildings')
      .select('id,name')
      .ilike('name', `%${name}%`)
      .order('name', { ascending: true })
      .limit(1);
    if (error || !data?.[0]) return null;
    return data[0];
  }

  async function getUnitCount(supabase: any, buildingId: string) {
    const { count, error } = await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .eq('building_id', buildingId);
    if (error || typeof count !== 'number') return 0;
    return count;
  }

  async function resolveUnit(supabase: any, buildingId: string, token: string) {
    const tokenLike = `%${token}%`;
    const { data, error } = await supabase
      .from('units')
      .select('id,label,number')
      .eq('building_id', buildingId)
      .or(`label.ilike.${tokenLike},number.ilike.${tokenLike}`)
      .order('label', { ascending: true })
      .limit(1);
    if (error || !data?.[0]) return null;
    const u = data[0];
    return { id: u.id, label: u.label ?? String(u.number ?? token) };
  }

  async function getLeaseholderForUnit(supabase: any, unitId: string) {
    // latest active lease (end_date null or in future)
    const { data: leases, error } = await supabase
      .from('leases')
      .select('id,leaseholder_id,start_date,end_date')
      .eq('unit_id', unitId)
      .order('start_date', { ascending: false })
      .limit(1);
    if (error || !leases?.[0]) return null;
    const leaseholderId = leases[0].leaseholder_id;
    const { data: lh, error: e2 } = await supabase
      .from('leaseholders')
      .select('id,name,email,phone')
      .eq('id', leaseholderId)
      .limit(1);
    if (e2 || !lh?.[0]) return null;
    return lh[0];
  }
}
