import { NextResponse } from "next/server";
import { getFounderGuidance } from "@/lib/ai/founder";
import { buildPrompt } from "@/lib/buildPrompt"; // adapt if named export

function redact(s?: string, n=1400){ if(!s) return ""; return s.length>n ? s.slice(0,n)+" …[truncated]" : s; }

export async function GET(req: Request) {
  // Dev-only guard
  if (process.env.NODE_ENV !== "development" && process.env.ALLOW_DEV_ENDPOINTS !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  if (!process.env.FOUNDER_PROOF_TOKEN || token !== process.env.FOUNDER_PROOF_TOKEN) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const topic = searchParams.get("topic") || "complaints";
  const sample = "Resident complaint about lift outages and a ceiling leak — please draft a reply and next steps.";

  const guidance = await getFounderGuidance({ topicHints:[topic], contexts:[topic], tags:[topic], limit:6 }).catch(()=>[]);
  // @ts-ignore – adapt to your buildPrompt signature
  const built = await buildPrompt?.({ 
    contextType: "core",
    question: sample
  });
  let system = "";
  if (typeof built === "string") {
    system = built;
  }

  return NextResponse.json({
    ok: true,
    topic,
    founder_guidance_count: Array.isArray(guidance) ? guidance.length : 0,
    system_prompt_contains_founder_block: /Founder Knowledge \(merge\)/i.test(system),
    system_prompt_preview: redact(system),
    source: "founder_knowledge (backend)"
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
