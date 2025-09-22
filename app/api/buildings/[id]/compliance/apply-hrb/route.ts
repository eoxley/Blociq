import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { data: all, error: e1 } = await supabaseAdmin
    .from("compliance_assets").select("id").ilike("category", "HRB%");
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  const { data: existing } = await supabaseAdmin
    .from("building_compliance_assets")
    .select("asset_id").eq("building_id", params.id);
  const have = new Set((existing||[]).map((x:any)=>x.asset_id));
  const toAdd = (all||[]).map((a:any)=>a.id).filter((id:string)=>!have.has(id));
  if (!toAdd.length) return NextResponse.json({ inserted: 0 });
  const rows = toAdd.map((cid:string)=>({ building_id: params.id, asset_id: cid }));
  const { error: e2 } = await supabaseAdmin.from("building_compliance_assets").insert(rows);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  return NextResponse.json({ inserted: rows.length, asset_ids: toAdd });
}
