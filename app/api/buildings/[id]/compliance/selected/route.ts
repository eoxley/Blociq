import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from("building_compliance_assets")
    .select("asset_id")
    .eq("building_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ asset_ids: (data || []).map(d => d.asset_id) });
}
