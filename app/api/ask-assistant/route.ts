// File: app/api/ask-assistant/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { handleAssistantQuery } from '@/lib/ai/handleAssistantQuery';

export async function POST(req: Request) {
  console.log("✅ BlocIQ Assistant endpoint hit");

  try {
    const body = await req.json();
    const message = body?.message;
    const buildingId = body?.buildingId; // Optional: if building is selected in UI
    const unitId = body?.unitId; // Optional: if unit is specified

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
    console.log("🏢 Building ID from context:", buildingId);
    console.log("🏠 Unit ID from context:", unitId);

    // Use the shared AI function
    const answer = await handleAssistantQuery({
      userQuestion: message,
      buildingId: buildingId?.toString() || null,
      supabase,
    });

    console.log("🧠 Assistant reply:", answer);

    return NextResponse.json({ 
      answer: answer || "🤖 Sorry, I couldn't generate a response.",
      context: {
        building: buildingId ? 'Building context available' : null,
        unit: unitId ? 'Unit context available' : null,
        documents: 'Document search available'
      }
    });

  } catch (err: any) {
    console.error("🔥 Fatal assistant error:", err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 