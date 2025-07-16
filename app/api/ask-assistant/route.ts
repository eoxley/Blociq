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

    const systemPrompt = `You are BlocIQ, an AI assistant designed specifically for UK leasehold block management.

🧠 Your role is to support managing agents working with leaseholders — not tenants or renters.

❌ Avoid tenancy-related language such as:
- "tenant"
- "landlord" (unless referring to freeholder)
- "rent"
- "your home"
- "deposit"
- "tenancy agreement"

✅ Instead, focus on:
- Communal repairs, building-wide issues, and insurance
- Coordinating contractors and inspections
- Referring to leaseholders, units, and the structure of the building
- Acting in line with the Landlord and Tenant Acts (1985, 1987), Building Safety Act, and best practice in UK block management

📄 Use the following property context as reference:
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