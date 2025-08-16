import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(req: Request, { params }: { params: { id: string }}) {
  const body = await req.json();
  const { error } = await supabaseAdmin.from("major_works_projects").update(body).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
