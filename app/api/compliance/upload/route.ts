import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "documents"; // adjust if your bucket differs

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const bca_id = String(form.get("bca_id") || "");
    const building_id = String(form.get("building_id") || "");
    if (!file || !bca_id || !building_id) {
      return NextResponse.json({ error: "Missing file/bca_id/building_id" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "dat";
    const path = `${building_id}/compliance/${bca_id}/${Date.now()}_${file.name}`;
    const array = new Uint8Array(await file.arrayBuffer());

    const up = await (supabaseAdmin as any).storage.from(BUCKET).upload(path, array, {
      contentType: file.type || "application/octet-stream",
      upsert: true
    });
    if (up.error) throw up.error;

    // create building_documents (minimal columns)
    const { data: doc, error: e1 } = await supabaseAdmin
      .from("building_documents")
      .insert({ building_id, file_name: file.name, storage_path: path, type: "compliance" })
      .select()
      .single();
    if (e1) throw e1;

    // link
    const { error: e2 } = await supabaseAdmin
      .from("building_compliance_documents")
      .insert({ building_compliance_asset_id: bca_id, document_id: doc.id });
    if (e2) throw e2;

    return NextResponse.json({ ok: true, doc_id: doc.id, path });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
