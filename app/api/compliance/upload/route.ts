import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "compliance-documents"; // Use the correct bucket for compliance documents

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const bca_id = String(form.get("bca_id") || "");
    const building_id = String(form.get("building_id") || "");
    
    if (!file || !bca_id || !building_id) {
      return NextResponse.json({ error: "Missing file/bca_id/building_id" }, { status: 400 });
    }

    console.log('📎 Uploading compliance document:', {
      fileName: file.name,
      fileSize: file.size,
      buildingId: building_id,
      bcaId: bca_id
    });

    // Upload file to Supabase storage
    const ext = file.name.split(".").pop() || "dat";
    const path = `${building_id}/compliance/${bca_id}/${Date.now()}_${file.name}`;
    const array = new Uint8Array(await file.arrayBuffer());

    const up = await (supabaseAdmin as any).storage.from(BUCKET).upload(path, array, {
      contentType: file.type || "application/octet-stream",
      upsert: true
    });
    
    if (up.error) {
      console.error('❌ Storage upload failed:', up.error);
      throw up.error;
    }

    console.log('✅ File uploaded to storage:', path);

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(path);

    // Create compliance document record using the correct table structure
    const { data: doc, error: docError } = await supabaseAdmin
      .from("compliance_documents")
      .insert({ 
        building_id: building_id,
        compliance_asset_id: bca_id,
        document_url: publicUrl,
        title: file.name,
        doc_type: 'compliance',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (docError) {
      console.error('❌ Failed to create compliance document record:', docError);
      throw docError;
    }

    console.log('✅ Compliance document record created:', doc.id);

    // Update the building_compliance_assets table with the latest document
    const { error: updateError } = await supabaseAdmin
      .from("building_compliance_assets")
      .update({ 
        latest_document_id: doc.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", bca_id);
    
    if (updateError) {
      console.warn('⚠️ Failed to update building_compliance_assets with document reference:', updateError);
      // Don't throw here as the main upload was successful
    }

    return NextResponse.json({ 
      ok: true, 
      doc_id: doc.id, 
      path,
      public_url: publicUrl
    });
    
  } catch (e: any) {
    console.error('❌ Compliance upload error:', e);
    return NextResponse.json({ 
      error: e.message || "Upload failed",
      details: e.details || e.hint || 'Unknown error'
    }, { status: 500 }); 
  }
}
