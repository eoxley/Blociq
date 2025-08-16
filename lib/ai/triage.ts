import { triageSystem } from "./triagePrompt";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function classifyEmailForTriage(email: {
  subject: string; from?: string; preview?: string; body?: string;
}) {
  const messages = [
    { role: "system", content: triageSystem },
    { role: "user", content: JSON.stringify(email) }
  ];
  const r = await openai.chat.completions.create({
    model: process.env.OPENAI_TRIAGE_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages
  });
  const text = r.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(extractJson(text)); } catch { return null; }
}

function extractJson(s: string) {
  const m = s.match(/```json\s*([\s\S]*?)```/i);
  if (m) return m[1];
  const i = s.indexOf("{"), j = s.lastIndexOf("}");
  return i >= 0 && j > i ? s.slice(i, j + 1) : "{}";
}
