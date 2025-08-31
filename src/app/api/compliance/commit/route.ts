import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serverSupabase } from "@/lib/serverSupabase";

const Body = z.object({
  buildingId: z.string().uuid(),
  rows: z.array(z.object({
    filename: z.string(),
    storagePath: z.string(),
    mime: z.string().optional(),
    doc_type: z.string(),
    asset_title: z.string(),
    summary_markdown: z.string(),
    frequency_months: z.number().int().optional(),
    last_completed_date: z.string().optional(),
    next_due_date: z.string().optional(),
    provider: z.string().optional(),
    reference: z.string().optional(),
    confidence: z.number(),
    matched_asset_id: z.string().uuid().optional()
  })).min(1)
});

export async function POST(req: NextRequest) {
  const sb = serverSupabase();
  try {
    const body = Body.parse(await req.json());

    // 1) Ensure there is a compliance asset match; if not, attempt to create a building link later with manual review
    const upserts = [];
    for (const r of body.rows) {
      // a) Insert document
      const { data: docIns, error: docErr } = await sb
        .from("compliance_documents")
        .insert({
          building_id: body.buildingId,
          compliance_asset_id: r.matched_asset_id || null,
          document_url: r.storagePath,
          title: r.filename,
          summary: r.summary_markdown,
          doc_type: r.doc_type,
          extracted_date: new Date().toISOString()
        })
        .select("id").single();
      if (docErr) throw new Error(`document insert failed: ${docErr.message}`);

      // b) Upsert building_compliance_assets row for matched asset
      let bcaId: string | null = null;
      if (r.matched_asset_id) {
        // find existing
        const { data: existing } = await sb
          .from("building_compliance_assets")
          .select("id, frequency_months")
          .eq("building_id", body.buildingId)
          .eq("compliance_asset_id", r.matched_asset_id)
          .limit(1);

        const freq = r.frequency_months ?? existing?.[0]?.frequency_months ?? null;

        if (existing && existing.length) {
          const { data: upd, error: upErr } = await sb
            .from("building_compliance_assets")
            .update({
              last_completed_date: r.last_completed_date ?? null,
              next_due_date: r.next_due_date ?? null,
              frequency_months: freq
            })
            .eq("id", existing[0].id)
            .select("id").single();
          if (upErr) throw new Error(upErr.message);
          bcaId = upd.id;
        } else {
          const { data: ins, error: inErr } = await sb
            .from("building_compliance_assets")
            .insert({
              building_id: body.buildingId,
              compliance_asset_id: r.matched_asset_id,
              last_completed_date: r.last_completed_date ?? null,
              next_due_date: r.next_due_date ?? null,
              frequency_months: freq
            })
            .select("id").single();
          if (inErr) throw new Error(inErr.message);
          bcaId = ins.id;
        }

        // c) Link document to that building compliance asset
        const { error: linkErr } = await sb
          .from("building_compliance_documents")
          .insert({
            building_compliance_asset_id: bcaId,
            document_id: docIns.id
          });
        if (linkErr) throw new Error(linkErr.message);
      }

      upserts.push({ docId: docIns.id, bcaId, filename: r.filename });
    }

    return NextResponse.json({ ok: true, upserts }, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? "commit failed" }, { status: 400 });
  }
}
