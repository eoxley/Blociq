import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("compliance_assets")
    .select("id, title, category, description, frequency_months, frequency")
    .order("category", { ascending: true })
    .order("title", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data || []).map((r: any) => ({ ...r, name: r.title }));
  return NextResponse.json({ data: rows });
}
