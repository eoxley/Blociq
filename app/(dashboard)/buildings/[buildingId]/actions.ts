"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateBuildingNotes(buildingId: string, notes: string) {
  const supabase = createClient();
  const { error } = await supabase.from("buildings").update({ notes }).eq("id", buildingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/buildings/${buildingId}`);
  return { ok: true };
}

export async function summariseBuilding(buildingId: string) {
  // Pull basic building context
  const supabase = createClient();
  const { data: building } = await supabase.from("buildings").select("*").eq("id", buildingId).single();

  // You may join extra context here (structure, compliance snapshot, open tasks), or keep it minimal
  const prompt = `
You are an assistant for UK block management. Summarise the building below and list gaps/risks and 5-10 next actions.
Return markdown with sections: **Summary**, **Risks/Gaps**, **Suggested Actions**.

BUILDING:
${JSON.stringify(building ?? {}, null, 2)}
  `.trim();

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/ask-ai`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
    // If your /api/ask-ai expects a different shape, adapt accordingly.
  });

  if (!res.ok) throw new Error(`ask-ai failed: ${res.status}`);
  const data = await res.json();
  return { markdown: data?.answer ?? data?.content ?? String(data) };
}
