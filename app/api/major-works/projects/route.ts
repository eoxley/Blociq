import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("major_works_projects")
    .select("*, buildings(name)")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { error } = await supabaseAdmin.from("major_works_projects").insert({
      building_id: body.building_id, title: body.title, stage: body.stage || "planning",
      s20_required: !!body.s20_required, budget_estimate: body.budget_estimate || null,
      next_milestone: body.next_milestone || null, next_milestone_date: body.next_milestone_date || null, notes: body.notes || null
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
