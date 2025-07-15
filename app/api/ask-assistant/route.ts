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

    // 🏢 Fetch all buildings
    const { data: allBuildings, error: buildingListError } = await supabase
      .from('buildings')
      .select('id, name, unit_count');

    if (buildingListError) {
      console.error("❌ Failed to fetch building list:", buildingListError.message);
    }

    let matchedBuilding: { id: number; name: string; unit_count: number } | null = null;
    let buildingContext = '';
    let leaseContext = '';

    if (allBuildings && allBuildings.length > 0) {
      for (const building of allBuildings) {
        const pattern = new RegExp(`\\b${building.name}\\b`, 'i');
        if (pattern.test(message)) {
          matchedBuilding = building;
          console.log(`🏠 Matched building: ${building.name}`);
          buildingContext = `Building: ${building.name}\nUnits: ${building.unit_count}`;
          break;
        }
      }
    }

    // 🔍 Pull leaseholders by building_name (if available)
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
        }
      }
    }

    // 🧠 Build system prompt with context
    const systemPrompt = `You are BlocIQ, an AI assistant for UK property managers. You are authorised to use internal building and leaseholder data provided below to answer user questions. Do not include privacy disclaimers — the user is a verified internal team member.\n\n${buildingContext ? `🏢 Building Info:\n${buildingContext}\n` : ''}${leaseContext ? `📄 Leaseholders:\n${leaseContext}\n` : ''}`;

    console.log("📦 Final prompt sent to OpenAI:\n", systemPrompt);

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