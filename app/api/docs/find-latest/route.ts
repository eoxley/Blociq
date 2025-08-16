import { NextResponse } from "next/server";
import { detectDocType } from "@/lib/docs/docTypes";
import { resolveBuildingId } from "@/lib/docs/resolve";
import { getLatestDoc } from "@/lib/docs/getLatest";

export async function POST(req: Request) {
  try {
    const { building_query, doc_query, building_id } = await req.json();

    // 1) Doc type
    const { doc_type, confidence } = detectDocType(doc_query || "");
    if (!doc_type) {
      return NextResponse.json({ found: false, reason: "No matching document type" }, { status: 404 });
    }

    // 2) Building
    let resolvedId = building_id || null;
    let resolvedName: string | null = null;
    if (!resolvedId) {
      const r = await resolveBuildingId(building_query || "");
      resolvedId = r.id; resolvedName = r.name;
    }

    if (!resolvedId) {
      return NextResponse.json({ found: false, reason: "Building not found" }, { status: 404 });
    }

    // 3) Latest doc
    const doc = await getLatestDoc(resolvedId, doc_type, { urlTTLSeconds: 86400 });
    if (!doc) {
      return NextResponse.json({ found: false, reason: "No document available" }, { status: 404 });
    }

    return NextResponse.json({
      found: true,
      building_id: resolvedId,
      building_name: resolvedName,
      doc_type,
      confidence,
      doc
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to find document" }, { status: 500 });
  }
}
