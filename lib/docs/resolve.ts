// lib/docs/resolve.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function resolveBuildingId(q: string): Promise<{ id: string | null; name: string | null }> {
  if (!q) return { id: null, name: null };
  const { data, error } = await supabaseAdmin
    .from("buildings")
    .select("id,name")
    .ilike("name", `%${q}%`)
    .limit(1);
  if (error || !data?.length) return { id: null, name: null };
  return { id: data[0].id, name: data[0].name };
}
