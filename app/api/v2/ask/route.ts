import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { AI_ENABLED, OPENAI_API_KEY } from '@/lib/ai/config';
import type { AskAiAnswer } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { question = '', context = {} } = body as { 
    question?: string; 
    context?: { 
      email?: { id?: string; outlookId?: string; subject?: string; from?: string; bodyText?: string }; 
      tone?: string; 
      mode?: string 
    } 
  };

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return json({ status:'forbidden', answer:'Sign in required.' }, 401);

  // --- Normalise question ---
  const qRaw = String(question || '').trim();
  const q = qRaw.toLowerCase();

  // QUICK HELPERS
  const yes = (s: string) => q.includes(s);
  const rx = (r: RegExp) => r.test(q);

  // 0) SECTION 20
  if (rx(/\b(section\s*20|s20)\b/)) {
    const answer = [
      'Section 20 (Landlord & Tenant Act 1985) is the consultation you must run before:',
      '• Qualifying Works: any leaseholder would pay > £250',
      '• Qualifying Long-Term Agreement (QLTA): > £100 per leaseholder in a year',
      'Typical flow: Stage 1 Notice of Intention (30 days), Stage 2 Estimates (30 days), then Notice of Reasons/award.',
      'If urgent, you can apply to the Tribunal to dispense with consultation.',
    ].join('\n');
    return ok(answer, 'ok', {
      actions: [
        { type: 'letter', label: 'Create Stage 1 Notice', payload: { stage: 1 } },
        { type: 'letter', label: 'Create Stage 2 Notice', payload: { stage: 2 } },
        { type: 'doc',    label: 'Add Schedule of Works' }
      ]
    });
  }

  // 1) UNIT COUNT
  let mUnits = q.match(/how\s+many\s+units\s+does\s+(.+?)\s+have\??$/i);
  if (mUnits) {
    const name = mUnits[1].trim();
    const b = await resolveBuilding(supabase, name);
    if (!b) return ok(`I couldn't find "${name}".`, 'not_found');
    const count = await getUnitCount(supabase, b.id);
    return ok(`${b.name} has ${count} units.`, 'ok', { building: b, count });
  }

  // 2) LEASEHOLDER LOOKUPS (name/number/email)
  const leaseRx = /(who\s+is\s+the\s+leaseholder|leaseholder.*(name|number|phone|email)|who\s+owns)/i;
  if (leaseRx.test(q)) {
    // Extract unit token and building name: supports "Flat 5 Ashwood House", "5 at Ashwood House", "5 ashwood house"
    const m = q.match(/(?:flat|apt|apartment|no\.?)?\s*([a-z0-9]+)\s+(?:at|of|in)?\s*(.+)$/i);
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

    let answer = `Leaseholder for ${u.label}, ${b.name}: ${lh.name}`;
    if (wantsEmail && lh.email)  answer += ` · Email: ${lh.email}`;
    if (wantsNumber && lh.phone) answer += ` · Phone: ${lh.phone}`;
    if (!wantsEmail && !wantsNumber) {
      if (lh.email)  answer += ` · Email: ${lh.email}`;
      if (lh.phone)  answer += ` · Phone: ${lh.phone}`;
    }

    return ok(answer, 'ok', { building: b, unit: u, leaseholder: lh });
  }

  // 3) ANTISOCIAL BEHAVIOUR (ASB) GUIDANCE
  if (rx(/\b(antisocial|anti-social|asb)\b/)) {
    const answer = [
      'Quick plan for ASB in a block:',
      '1) Check the lease: nuisance/annoyance covenant; note breaches.',
      '2) Evidence: incident log, dates/times, witness statements, photos/audio if safe.',
      '3) Early action: warning letter; offer mediation where suitable.',
      '4) Escalate: formal breach notice; injunction if persistent. In criminal cases, liaise with Police/LA ASB team.',
      '5) Keep records for costs recovery and insurer notification if damage occurs.',
    ].join('\n');
    return ok(answer, 'ok', {
      actions: [
        { type: 'letter', label: 'Issue Warning Letter' },
        { type: 'task',   label: 'Open ASB Case' }
      ]
    });
  }

  // 4) LEAK BETWEEN FLATS
  if (rx(/\bleak\b/) && rx(/\b(apartment|flat)\b/)) {
    const answer = [
      'Leak triage:',
      '• Emergency? Advise stopcock off; dispatch contractor; make safe.',
      '• Source: demised (within flat) vs common parts (riser/roof/stack).',
      '• If demised: occupier/leaseholder arranges repair; consider negligence; manage neighbour impact.',
      '• If common parts: instruct block contractor; log claim with building insurer if damage.',
      '• Always: record photos, dates, areas affected; notify impacted leaseholders; confirm responsibilities by lease.',
    ].join('\n');
    return ok(answer, 'ok', {
      actions: [
        { type: 'task',   label: 'Raise Leak Job' },
        { type: 'letter', label: 'Notify Affected Leaseholder' }
      ]
    });
  }

  // 5) DRAFT/SUMMARY FALLBACK (thread-aware)
  if (/(reply|respond|draft|summary|summaris)/i.test(qRaw)) {
    const enrichedCtx = await enrichContext(supabase, session.user.id, context);
    const prompt = buildPromptFromContext(qRaw, context, enrichedCtx);
    const answer = await generateDraft(prompt);
    return ok(answer, 'ok', { usedContext: !!context, enriched: !!enrichedCtx });
  }

  // 6) Fallback
  return ok('Can you rephrase your question?', 'needs_clarification');

  // ---------- helpers ----------
  function json(payload: AskAiAnswer, status = 200) {
    return NextResponse.json(payload, { status });
  }
  function ok(answer: string, status: AskAiAnswer['status'] = 'ok', data?: any) {
    return json({ status, answer, data });
  }

  async function enrichContext(supabase: any, sessionUserId: string, ctx: any) {
    if (!ctx?.email?.id && !ctx?.email?.outlookId) return null;

    const emailId = ctx.email.id || ctx.email.outlookId;
    const result: any = {};

    // Get email thread (last 10 messages)
    try {
      const { data: thread } = await supabase
        .from('incoming_emails')
        .select('id,subject,from_email,from_name,body_preview,received_at,conversation_id')
        .eq('user_id', sessionUserId)
        .eq('conversation_id', emailId)
        .order('received_at', { ascending: false })
        .limit(10);
      
      if (thread?.length) {
        result.thread = thread.map(e => ({
          from: e.from_name || e.from_email || 'Unknown',
          date: e.received_at,
          bodyText: e.body_preview || '',
          subject: e.subject
        }));
      }
    } catch { /* ignore */ }

    // Resolve building/unit/leaseholder for sender
    try {
      const senderEmail = ctx.email.from;
      if (senderEmail) {
        // Try to find unit by leaseholder email
        const { data: leaseholder } = await supabase
          .from('leaseholders')
          .select('id,name,email,phone')
          .eq('email', senderEmail)
          .limit(1);
        
        if (leaseholder?.[0]) {
          result.leaseholder = leaseholder[0];
          
          // Find their unit
          const { data: leases } = await supabase
            .from('leases')
            .select('unit_id,start_date,end_date')
            .eq('leaseholder_id', leaseholder[0].id)
            .order('start_date', { ascending: false })
            .limit(1);
          
          if (leases?.[0]) {
            const { data: unit } = await supabase
              .from('units')
              .select('id,label,number,building_id')
              .eq('id', leases[0].unit_id)
              .limit(1);
            
            if (unit?.[0]) {
              result.unit = { id: unit[0].id, label: unit[0].label || String(unit[0].number) };
              
              // Get building
              const { data: building } = await supabase
                .from('buildings')
                .select('id,name')
                .eq('id', unit[0].building_id)
                .limit(1);
              
              if (building?.[0]) {
                result.building = building[0];
              }
            }
          }
        }
      }
    } catch { /* ignore */ }

    // Get open tickets for building/unit
    try {
      if (result.building?.id) {
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id,title,status,unit_id')
          .eq('building_id', result.building.id)
          .in('status', ['open', 'in_progress', 'pending'])
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (tickets?.length) {
          result.openTickets = tickets.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            isUnitTicket: result.unit?.id === t.unit_id
          }));
        }
      }
    } catch { /* ignore */ }

    // Get major works for building
    try {
      if (result.building?.id) {
        const { data: works } = await supabase
          .from('major_works')
          .select('id,title,stage,status')
          .eq('building_id', result.building.id)
          .in('status', ['planned', 'in_progress', 'pending'])
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (works?.length) {
          result.majorWorks = works.map(w => ({
            id: w.id,
            title: w.title,
            stage: w.stage,
            status: w.status
          }));
        }
      }
    } catch { /* ignore */ }

    // Get compliance due items
    try {
      if (result.building?.id) {
        const { data: compliance } = await supabase
          .from('building_compliance_assets')
          .select('asset_id,status,next_due_date')
          .eq('building_id', result.building.id)
          .lt('next_due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()) // Due within 30 days
          .order('next_due_date', { ascending: true })
          .limit(5);
        
        if (compliance?.length) {
          result.complianceDue = compliance.map(c => ({
            asset: c.asset_id,
            status: c.status,
            due: c.next_due_date
          }));
        }
      }
    } catch { /* ignore */ }

    // Get prior AI drafts for this thread
    try {
      if (ctx.email.conversation_id) {
        const { data: drafts } = await supabase
          .from('ai_generated_drafts')
          .select('content,created_at')
          .eq('thread_id', ctx.email.conversation_id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (drafts?.length) {
          result.priorDrafts = drafts.map(d => ({
            content: d.content,
            created_at: d.created_at
          }));
        }
      }
    } catch { /* ignore */ }

    // Get policy snippets
    try {
      const { data: policies } = await supabase
        .from('policy_snippets')
        .select('tag,title,content')
        .in('tag', ['BSA', 'Complaints'])
        .limit(2);
      
      if (policies?.length) {
        result.policy = {};
        policies.forEach(p => {
          if (p.tag === 'BSA') result.policy.bsa = p.content;
          if (p.tag === 'Complaints') result.policy.complaints = p.content;
        });
      }
    } catch { /* ignore */ }

    return result;
  }

  function buildPromptFromContext(userQuestion: string, ctx: any, enriched?: any) {
    const pieces: string[] = [
      `You are BlocIQ's assistant. UK English. Professional property management tone.`,
      `Task: ${userQuestion}`,
    ];

    // Basic context
    if (ctx?.email?.subject) pieces.push(`Subject: ${ctx.email.subject}`);
    if (ctx?.email?.from) pieces.push(`From: ${ctx.email.from}`);
    if (ctx?.email?.bodyText) pieces.push(`Body:\n${ctx.email.bodyText}`);
    if (ctx?.tone) pieces.push(`Tone: ${ctx.tone}`);

    // Enriched context
    if (enriched) {
      if (enriched.thread?.length > 1) {
        pieces.push(`Thread summary (${enriched.thread.length} messages):`);
        enriched.thread.slice(0, 3).forEach((msg: any, i: number) => {
          pieces.push(`${i + 1}. ${msg.from}: ${msg.subject || msg.bodyText.slice(0, 100)}...`);
        });
      }

      if (enriched.building) {
        pieces.push(`Building: ${enriched.building.name}`);
      }

      if (enriched.unit) {
        pieces.push(`Unit: ${enriched.unit.label}`);
      }

      if (enriched.leaseholder) {
        pieces.push(`Leaseholder: ${enriched.leaseholder.name} (${enriched.leaseholder.email})`);
      }

      if (enriched.openTickets?.length) {
        pieces.push(`Open tickets: ${enriched.openTickets.map((t: any) => 
          `#${t.id} ${t.title}${t.isUnitTicket ? ' (this unit)' : ''}`
        ).join(', ')}`);
      }

      if (enriched.majorWorks?.length) {
        pieces.push(`Major works: ${enriched.majorWorks.map((w: any) => 
          `#${w.id} ${w.title} (${w.stage || w.status})`
        ).join(', ')}`);
      }

      if (enriched.complianceDue?.length) {
        pieces.push(`Compliance due: ${enriched.complianceDue.map((c: any) => 
          `${c.asset} due ${new Date(c.due).toLocaleDateString('en-GB')}`
        ).join(', ')}`);
      }

      if (enriched.policy?.bsa) {
        pieces.push(`BSA guidance: ${enriched.policy.bsa.slice(0, 200)}...`);
      }

      if (enriched.priorDrafts?.length) {
        pieces.push(`Previous drafts: ${enriched.priorDrafts.length} available`);
      }
    }

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
          { role: 'system', content: 'You are a helpful UK property management assistant. Keep answers concise and professional. Reference relevant tickets/works when appropriate.' },
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
