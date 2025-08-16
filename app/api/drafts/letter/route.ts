import { NextResponse } from "next/server";
import OpenAI from "openai";

function extractJson(s: string) {
  const m = s.match(/```json\s*([\s\S]*?)```/i); if (m) return m[1];
  const i = s.indexOf("{"), j = s.lastIndexOf("}"); return i>=0 && j>i ? s.slice(i, j+1) : "{}";
}

export async function POST(req: Request) {
  const { to_name, to_address, subject_hint, context } = await req.json();
  const system = `You are Ask BlocIQ using the 'uk-letter-style' rules.`;
  const user = JSON.stringify({ to_name, to_address, subject_hint, context });

  const r = await OpenAI.chat.completions.create({
    model: process.env.OPENAI_MAIN_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [{ role: "system", content: system }, { role: "user", content: user }]
  });

  const content = r.choices?.[0]?.message?.content || "";
  let meta = {}; try { meta = JSON.parse(extractJson(content)); } catch {}
  return NextResponse.json({ content, meta });
}
