// app/api/ask-assistant/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  console.log("✅ Assistant endpoint hit");

  try {
    const body = await req.json();
    console.log("📥 Request body:", body);

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
    } else {
      console.log("👤 Session user:", session?.user?.email);
    }

    // Extract building name from the user's message
    const buildingNameMatch = message.match(/(?:units|info).*?\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/);
    const buildingName = buildingNameMatch?.[1] || null;
    console.log("🔍 Detected building in query:", buildingName);

    let buildings: Array<{ id: number; name: string; unit_count: number }> | null = null;
    let buildingError: any = null;
    if (buildingName) {
      const result = await supabase
        .from('buildings')
        .select('id, name, unit_count')
        .ilike('name', `%${buildingName}%`);
      buildings = result.data as Array<{ id: number; name: string; unit_count: number }> | null;
      buildingError = result.error;
      if (buildingError) {
        console.warn("⚠️ Supabase building fetch error:", buildingError.message);
      }
      console.log("🏢 Fetched building data:", buildings);
    } else {
      console.log("ℹ️ No building name detected in query.");
    }

    // Optionally include building info in the AI prompt
    const buildingInfo = buildings && buildings.length > 0
      ? `Building info: ${JSON.stringify(buildings[0])}`
      : '';

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: "system",
        content: "You are BlocIQ, a helpful assistant for UK property managers. Answer in plain English, based on property law and best practice.",
      },
      ...(buildingInfo ? [{ role: "system" as const, content: buildingInfo }] : []),
      {
        role: "user",
        content: message,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
    });

    const reply = completion.choices?.[0]?.message?.content || "🤖 Sorry, no response was generated.";
    console.log("🧠 OpenAI reply:", reply);

    return NextResponse.json({ answer: reply });
  } catch (err: any) {
    console.error("🔥 Fatal assistant error:", err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 