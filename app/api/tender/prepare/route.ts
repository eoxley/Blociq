import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

const SYSTEM = `
You draft UK tender invitation emails for block-management works (RICS/TPI aligned).
Rules: UK English; concise; include brief scope, requested attendance/site visit if relevant, return-by date, insurance and competence confirmation, pricing format, and how to respond. No comma after greeting. Sign off "Kind regards".
Output JSON only:
{"subject": "...", "body": "..."}
`;

export async function POST(req: Request) {
  try {
    const { building, work, return_by, contact, extras } = await req.json();
    const messages = [
      { role: "system", content: SYSTEM },
      { role: "user", content: JSON.stringify({ building, work, return_by, contact, extras }) }
    ];
    const r = await openai.chat.completions.create({
      model: process.env.OPENAI_MAIN_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages
    });
    const text = r.choices?.[0]?.message?.content || "{}";
    const json = safeJSON(text);
    return NextResponse.json({ subject: json.subject || `Tender request — ${work?.title||building?.name||"BlocIQ"}`, body: json.body || "" });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Failed to prepare tender" }, { status: 500 });
  }
}
function safeJSON(s:string){ const m=s.match(/```json\s*([\s\S]*?)```/i); if(m){try{return JSON.parse(m[1]);}catch{}} try{return JSON.parse(s);}catch{return {};}}
