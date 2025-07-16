// File: app/api/ask-assistant/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  console.log("✅ BlocIQ Assistant endpoint hit");

  try {
    const body = await req.json();
    const message = body?.message;

    if (!message) {
      console.error("❌ No message provided");
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn("⚠️ Supabase session error:", sessionError.message);
    }

    console.log("📩 User message:", message);

    // Fetch all buildings with ops notes
    const { data: allBuildings, error: buildingListError } = await supabase
      .from('buildings')
      .select(`
        id,
        name,
        unit_count,
        key_access_notes,
        parking_notes,
        meter_location,
        bin_location,
        entry_code,
        fire_panel_location
      `);

    if (buildingListError) {
      console.error("❌ Failed to fetch building list:", buildingListError.message);
    }

    let matchedBuilding: {
      id: number;
      name: string;
      unit_count: number;
      key_access_notes: string | null;
      parking_notes: string | null;
      meter_location: string | null;
      bin_location: string | null;
      entry_code: string | null;
      fire_panel_location: string | null;
    } | null = null;
    let buildingContext = '';
    let leaseContext = '';

    if (allBuildings && allBuildings.length > 0) {
      for (const building of allBuildings) {
        const pattern = new RegExp(`\\b${building.name}\\b`, 'i');
        if (pattern.test(message)) {
          matchedBuilding = building;
          console.log(`🏠 Matched building: ${building.name}`);
          buildingContext = `
Building: ${building.name}
Units: ${building.unit_count}
🔑 Keys: ${building.key_access_notes || 'Not available'}
🅿️ Parking: ${building.parking_notes || 'Not available'}
📟 Entry Code: ${building.entry_code || 'Not available'}
⚡ Meter Location: ${building.meter_location || 'Not available'}
🗑️ Bin Location: ${building.bin_location || 'Not available'}
🔥 Fire Panel: ${building.fire_panel_location || 'Not available'}
          `.trim();
          break;
        }
      }
    }

    // 🧠 Fetch leaseholders for matched building
    if (matchedBuilding) {
      const { data: leases, error: leaseError } = await supabase
        .from('leases')
        .select('unit, leaseholder_name')
        .ilike('building_name', `%${matchedBuilding.name}%`);

      if (leaseError) {
        console.warn("⚠️ Lease fetch error:", leaseError.message);
      } else {
        console.log("📄 Lease rows fetched:", leases?.length || 0);
        if (leases?.length > 0) {
          leaseContext = leases.map(l => `${l.unit}: ${l.leaseholder_name}`).join('\n');
          console.log("📄 Leaseholders injected:", leaseContext);
        } else {
          console.log("📭 No leases matched for building:", matchedBuilding.name);
        }
      }
    }

    const systemPrompt = `You are BlocIQ, a professional AI assistant built for UK **leasehold block management**.

🧠 Your role is to assist property managers dealing with **leaseholders**, not tenants. Always respond from the perspective of a managing agent handling communal issues, compliance, and coordination within blocks of flats.

🔒 HARD RULES:
- Do NOT use tenancy-related terms like "tenant", "landlord" (except when referring to the freeholder), "rent", "deposit", or "your home".
- Do NOT assume internal repairs fall under the agent's remit — they often do not.

✅ YOU SHOULD:
- Refer to structural or communal issues (roof, external walls, shared services)
- Recommend inspections before assigning responsibility
- Mention access coordination, insurance claims, and service charge implications
- Use phrases like "as the managing agent for the building…" or "under the terms of the lease…"

📚 LEGAL CONTEXT:
Reference UK legislation and standards where helpful:
- Landlord and Tenant Act 1985 (e.g. Section 20 consultations, repair obligations)
- Landlord and Tenant Act 1987 (e.g. variations, Tribunal rights)
- Building Safety Act 2022 (e.g. safety cases, accountable persons)
- Buildings insurance, fire risk assessments, and statutory compliance

🎯 TONE OPTIONS (optional, if passed in the context):
- \`tone: "formal"\` → Maintain a professional, precise tone
- \`tone: "friendly"\` → Use a warm and understanding tone (still professional)
- \`tone: "warning"\` → Use firm, clear language regarding breaches or risks

🛠 FUTURE OVERRIDE (optional): 
If context includes \`mode: "lettings"\`, you may adjust to tenancy tone — otherwise always assume leasehold.

📄 CONTEXTUAL DATA:
${buildingContext ? `🏢 Building Info:\n${buildingContext}` : ''}
${leaseContext ? `📄 Leaseholders:\n${leaseContext}` : ''}`;

    console.log("📦 Final prompt to OpenAI:\n", systemPrompt);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.4,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "🤖 Sorry, I couldn't generate a response.";
    console.log("🧠 Assistant reply:", reply);

    return NextResponse.json({ answer: reply });

  } catch (err: any) {
    console.error("🔥 Fatal assistant error:", err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 