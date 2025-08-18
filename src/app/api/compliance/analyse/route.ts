import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { serverSupabase } from "@/lib/serverSupabase";
import { extractTextFromBuffer, ocrFallback } from "@/lib/compliance/docExtract";
import { COMPLIANCE_SYSTEM_PROMPT } from "@/ai/compliancePrompt";
import { ComplianceDocExtraction } from "@/ai/complianceSchema";
import { matchAssetByTitle } from "@/lib/compliance/matchAsset";

const Body = z.object({
  buildingId: z.string().uuid(),
  files: z.array(z.object({
    storagePath: z.string(),   // e.g. building_documents/<uuid>/<filename>.pdf
    filename: z.string(),
    mime: z.string().optional()
  })).min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const sb = serverSupabase();
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const results: any[] = [];

    for (const f of body.files) {
      // 1) Download file from Supabase Storage
      const { data: dl, error: dlErr } = await sb.storage.from("building_documents").download(f.storagePath);
      if (dlErr) throw new Error(`Download failed for ${f.storagePath}: ${dlErr.message}`);
      const buf = Buffer.from(await dl.arrayBuffer());

      // 2) Extract text
      let text = await extractTextFromBuffer(f.filename, f.mime, buf);
      if (!text || text.trim().length < 40) {
        const ocr = await ocrFallback(f.filename, buf);
        if (ocr) text = ocr;
      }

      // 3) Build Ask BlocIQ context snippets (lightweight; plug in your real helpers if available)
      // You can import your real: getBuildingContext, existing assets for building, last docs, etc.
      const buildingCtx = { id: body.buildingId };

      // 4) Call OpenAI with strict instructions
      const messages = [
        { role: "system", content: COMPLIANCE_SYSTEM_PROMPT },
        { role: "user", content: `Document: ${f.filename}\n\n-----\n${text.slice(0, 120000)}` } // guard tokens
      ];
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_TRIAGE_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages
      });

      const raw = completion.choices?.[0]?.message?.content ?? "{}";
      let parsed;
      try { parsed = ComplianceDocExtraction.parse(JSON.parse(raw)); }
      catch (e:any) { throw new Error(`AI parse failed for ${f.filename}: ${e.message}`); }

      // 5) Match to compliance_assets
      const matched = await matchAssetByTitle(sb, parsed.asset_title);

      results.push({
        filename: f.filename,
        storagePath: f.storagePath,
        mime: f.mime,
        ...parsed,
        matched_asset_id: matched?.id ?? null
      });
    }

    return NextResponse.json({ files: results }, { status: 200 });
  } catch (err:any) {
    return NextResponse.json({ error: err.message ?? "analyse failed" }, { status: 400 });
  }
}
