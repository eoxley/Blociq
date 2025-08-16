import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("compliance_assets")
      .select("id,name,category,description,frequency_months")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
