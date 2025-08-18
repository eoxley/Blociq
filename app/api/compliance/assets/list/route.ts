import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canonicaliseCategory, canonicaliseTitle, deriveFrequencyLabel } from "@/lib/compliance/normalise";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("compliance_assets")
    .select("id, title, category, description, frequency_months, frequency")
    .order("category", { ascending: true })
    .order("title", { ascending: true });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Apply normalisation and derive frequency labels
  const rows = (data || []).map((r: any) => ({
    ...r,
    name: r.title, // Keep for backward compatibility
    canonicalTitle: canonicaliseTitle(r.title),
    canonicalCategory: canonicaliseCategory(r.category),
    derivedFrequency: deriveFrequencyLabel(r.frequency_months, r.frequency)
  }));
  
  // Group by canonical category for better UI organisation
  const groupedAssets = rows.reduce((acc: Record<string, any[]>, asset) => {
    const category = asset.canonicalCategory;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(asset);
    return acc;
  }, {});
  
  return NextResponse.json({ 
    data: rows,
    groupedAssets,
    total: rows.length
  });
}
