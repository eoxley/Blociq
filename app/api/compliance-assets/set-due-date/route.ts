import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("📅 Setting compliance asset due date...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    const formData = await req.formData();
    const buildingId = formData.get('building_id') as string;
    const assetId = formData.get('asset_id') as string;
    const nextDueDate = formData.get('next_due_date') as string;
    const status = formData.get('status') as string || 'Due Soon';
    const notes = formData.get('notes') as string || '';

    console.log("📋 Received data:", {
      buildingId,
      assetId,
      nextDueDate,
      status,
      notes: notes.substring(0, 50) + (notes.length > 50 ? '...' : '')
    });

    // Validation
    if (!buildingId || !assetId) {
      console.error("❌ Validation failed: Missing required fields");
      return NextResponse.json({ error: "Building ID and Asset ID are required" }, { status: 400 });
    }

    // Validate building exists
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single();

    if (buildingError || !building) {
      console.error("❌ Building not found:", buildingError);
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    console.log("✅ Building found:", building.name);

    // Validate asset exists
    const { data: asset, error: assetError } = await supabase
      .from('compliance_assets')
      .select('id, name')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      console.error("❌ Compliance asset not found:", assetError);
      return NextResponse.json({ error: "Compliance asset not found" }, { status: 404 });
    }

    console.log("✅ Compliance asset found:", asset.name);

    // Prepare data for upsert
    const complianceData = {
      building_id: parseInt(buildingId, 10),
      asset_id: assetId,
      status: status,
      next_due_date: nextDueDate || null,
      notes: notes || null,
      last_updated: new Date().toISOString()
    };

    console.log("💾 Upserting compliance data...");

    // Upsert the compliance asset record
    const { data: upsertData, error: upsertError } = await supabase
      .from('building_compliance_assets')
      .upsert(complianceData, { 
        onConflict: 'building_id,asset_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (upsertError) {
      console.error("❌ Database upsert error:", upsertError);
      return NextResponse.json({ 
        error: "Failed to save compliance data",
        details: upsertError.message
      }, { status: 500 });
    }

    console.log("✅ Compliance data saved successfully");

    const responseData = {
      message: "Compliance due date set successfully",
      data: {
        building_id: buildingId,
        asset_id: assetId,
        status: status,
        next_due_date: nextDueDate,
        notes: notes,
        last_updated: complianceData.last_updated
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        building_name: building.name,
        asset_name: asset.name
      }
    };

    console.log("🎉 Compliance due date set successfully");
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Set due date error:", error);
    return NextResponse.json({ 
      error: "Internal server error while setting due date",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 