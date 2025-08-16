import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const run_id = new URL(req.url).searchParams.get("run_id");
  if (!run_id) return NextResponse.json({ error: "run_id required" }, { status: 400 });

  const { data: run } = await supabaseAdmin.from("ai_triage_runs").select("*").eq("id", run_id).single();
  const { data: rows } = await supabaseAdmin.from("ai_triage_actions").select("applied, error").eq("run_id", run_id);
  const applied = (rows || []).filter(r => r.applied).length;
  const failed = (rows || []).filter(r => r.error).length;

  return NextResponse.json({ run, applied, failed });
}
