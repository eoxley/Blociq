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

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are BlocIQ, a helpful assistant for UK property managers. Answer in plain English, based on property law and best practice.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || "🤖 Sorry, no response was generated.";
    console.log("🧠 OpenAI reply:", reply);

    return NextResponse.json({ answer: reply });
  } catch (err: any) {
    console.error("🔥 Fatal assistant error:", err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 