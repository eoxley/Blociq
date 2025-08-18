import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/serverSupabase";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;
    const buildingId = form.get("buildingId") as string;
    if (!file) throw new Error("No file");

    const buf = Buffer.from(await file.arrayBuffer());
    const name = file.name.replace(/\s+/g, "_");
    const key = `${buildingId}/${randomUUID()}_${name}`;
    const sb = serverSupabase();
    const { error } = await sb.storage.from("building_documents").upload(key, buf, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ storagePath: key }, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? "upload failed" }, { status: 400 });
  }
}
