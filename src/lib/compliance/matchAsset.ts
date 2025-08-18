import { createClient } from "@supabase/supabase-js";

export async function matchAssetByTitle(serverSupabase: any, assetTitle: string) {
  // Simple ILIKE match first; you can replace with embeddings later
  const { data, error } = await serverSupabase
    .from("compliance_assets")
    .select("id, title")
    .ilike("title", `%${assetTitle}%`)
    .limit(1);
  if (!error && data && data.length) return data[0];
  // Fallback: try a few normalised heuristics
  const simplified = assetTitle.toLowerCase().replace(/[–—-]/g,"-").replace(/\s+/g," ").trim();
  const synonyms = [
    simplified,
    simplified.replace("fire risk assessment", "fra"),
    simplified.replace("electrical installation condition report", "eicr"),
    simplified.replace("emergency lighting", "emergency lighting")
  ];
  for (const s of synonyms) {
    const { data: d2 } = await serverSupabase
      .from("compliance_assets")
      .select("id, title")
      .ilike("title", `%${s}%`)
      .limit(1);
    if (d2 && d2.length) return d2[0];
  }
  return null;
}
