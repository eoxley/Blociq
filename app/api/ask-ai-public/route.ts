// app/api/ask-ai-public/route.ts
import { NextResponse } from "next/server";

// Edge-friendly; change to 'nodejs' if you later add Node-only libs.
export const runtime = "edge";
export const dynamic = "force-dynamic";

type AskBody = { prompt?: string };

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    let prompt = "";

    if (ct.includes("application/json")) {
      const body = (await req.json()) as AskBody;
      prompt = (body.prompt || "").trim();
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      prompt = String(form.get("prompt") || "").trim();
      // NOTE: If files are included later, parse them here and extract text,
      // but keep this route dependency-free.
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set" },
        { status: 500 }
      );
    }

    // Call OpenAI (or your chosen provider) – keep simple for public demo.
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // or your preferred small model
        messages: [
          {
            role: "system",
            content:
              "You are Ask Bloc. Provide concise, plain-English answers. Avoid sensitive personal data. If the user uploads a document, summarize it clearly and list 3–5 suggested actions.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      return NextResponse.json(
        { error: "LLM request failed", detail: err },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const answer =
      data?.choices?.[0]?.message?.content?.trim?.() || "No answer generated.";

    return NextResponse.json({ success: true, answer });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected error", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}

// Optional health check
export async function GET() {
  return NextResponse.json({ ok: true });
} 