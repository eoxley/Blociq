import { NextResponse } from "next/server";
import OpenAI from "openai";

function extractJson(s: string){ const m=s.match(/```json\s*([\s\S]*?)```/i); if(m) return m[1]; const i=s.indexOf("{"),j=s.lastIndexOf("}"); return i>=0&&j>i?s.slice(i,j+1):"{}"; }

export async function POST(req: Request) {
  const { agenda_json, notes, decisions, attendees, apologies, next_meeting } = await req.json();
  const system = `You are Ask BlocIQ using the 'meeting-minutes' rules.`;
  const user = JSON.stringify({ agenda_json, notes, decisions, attendees, apologies, next_meeting });

  const r = await OpenAI.chat.completions.create({
    model: process.env.OPENAI_MAIN_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [{ role: "system", content: system }, { role: "user", content: user }]
  });

  const content = r.choices?.[0]?.message?.content || "";
  let json = {}; try { json = JSON.parse(extractJson(content)); } catch {}
  return NextResponse.json({ content, json });
}
