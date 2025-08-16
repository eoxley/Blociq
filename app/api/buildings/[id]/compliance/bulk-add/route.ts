import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { asset_ids } = await req.json();
    if (!Array.isArray(asset_ids) || !asset_ids.length) return NextResponse.json({ inserted: 0 });
    const rows = asset_ids.map((cid: string) => ({ building_id: params.id, compliance_asset_id: cid }));
    const { error } = await supabaseAdmin.from("building_compliance_assets").insert(rows);
    if (error) throw error;
    return NextResponse.json({ inserted: rows.length });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
