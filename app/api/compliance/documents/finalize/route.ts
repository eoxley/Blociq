import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("📎 Finalizing compliance document...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Parse the request body
    const body = await req.json();
    const { document_id, compliance_asset_id, doc_type, classified_by_ai } = body;

    if (!document_id || !compliance_asset_id || !doc_type) {
      return NextResponse.json({ 
        error: "Missing required fields: document_id, compliance_asset_id, doc_type" 
      }, { status: 400 });
    }

    // Update the compliance document with the final classification
    const { data: updatedDocument, error: updateError } = await supabase
      .from("compliance_docs")
      .update({
        compliance_item_id: parseInt(compliance_asset_id),
        doc_type: doc_type,
        uploaded_by: user.id,
        created_at: new Date().toISOString()
      })
      .eq("id", document_id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Failed to update compliance document:", updateError);
      return NextResponse.json({ 
        error: "Failed to update compliance document",
        details: updateError.message 
      }, { status: 500 });
    }

    // Also store in building_documents for consistency
    const { data: buildingDoc, error: buildingDocError } = await supabase
      .from("building_documents")
      .insert({
        building_id: updatedDocument.building_id,
        file_name: `Compliance - ${doc_type}`,
        file_url: updatedDocument.doc_url,
        type: doc_type,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (buildingDocError) {
      console.warn("⚠️ Could not create building document record:", buildingDocError);
    }

    // Update the building asset's last_checked date if this is a certificate/report
    if (['Certificate', 'Report', 'Inspection Report', 'Test Certificate'].includes(doc_type)) {
      const { error: assetUpdateError } = await supabase
        .from("building_assets")
        .update({ 
          last_checked: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("building_id", updatedDocument.building_id)
        .eq("compliance_item_id", parseInt(compliance_asset_id));

      if (assetUpdateError) {
        console.warn("⚠️ Could not update building asset last_checked:", assetUpdateError);
      }
    }

    const responseData = {
      message: "Compliance document finalized successfully",
      document: {
        id: updatedDocument.id,
        doc_type: updatedDocument.doc_type,
        compliance_asset_id: updatedDocument.compliance_item_id,
        file_url: updatedDocument.doc_url,
        classified_by_ai: classified_by_ai || false,
        created_at: updatedDocument.created_at
      },
      building_document: buildingDoc,
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        ai_classified: classified_by_ai || false
      }
    };

    console.log("🎉 Compliance document finalized successfully");
    console.log("📊 Finalization details:", {
      document_id: updatedDocument.id,
      compliance_asset_id: updatedDocument.compliance_item_id,
      doc_type: updatedDocument.doc_type,
      ai_classified: classified_by_ai
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Compliance document finalization error:", error);
    return NextResponse.json({ 
      error: "Internal server error during document finalization",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 