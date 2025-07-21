import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("🔄 Updating compliance asset status...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    const body = await req.json();
    const { 
      buildingId, 
      assetId, 
      status, 
      nextDueDate, 
      notes 
    } = body;

    console.log("📋 Received update request:", {
      buildingId,
      assetId,
      status,
      nextDueDate,
      notes: notes ? notes.substring(0, 50) + (notes.length > 50 ? '...' : '') : null
    });

    // Validation
    if (!buildingId || !assetId) {
      console.error("❌ Validation failed: Missing required fields");
      return NextResponse.json({ error: "Building ID and Asset ID are required" }, { status: 400 });
    }

    if (!status) {
      console.error("❌ Validation failed: Status is required");
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
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

    // Prepare update data
    const updateData = {
      building_id: parseInt(buildingId, 10),
      asset_id: assetId,
      status: status,
      next_due_date: nextDueDate || null,
      notes: notes || null,
      last_updated: new Date().toISOString()
    };

    console.log("💾 Updating compliance data...");

    // Upsert the compliance asset record
    const { data: upsertData, error: upsertError } = await supabase
      .from('building_compliance_assets')
      .upsert(updateData, { 
        onConflict: 'building_id,asset_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (upsertError) {
      console.error("❌ Database upsert error:", upsertError);
      return NextResponse.json({ 
        error: "Failed to update compliance status",
        details: upsertError.message
      }, { status: 500 });
    }

    console.log("✅ Compliance status updated successfully");

    const responseData = {
      message: "Compliance status updated successfully",
      data: {
        id: upsertData.id,
        building_id: buildingId,
        asset_id: assetId,
        status: status,
        next_due_date: nextDueDate,
        notes: notes,
        last_updated: updateData.last_updated
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        building_name: building.name,
        asset_name: asset.name
      }
    };

    console.log("🎉 Compliance status update completed");
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Update status error:", error);
    return NextResponse.json({ 
      error: "Internal server error while updating status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    console.log("🗑️ Deleting compliance asset record...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('building_id');
    const assetId = searchParams.get('asset_id');

    console.log("📋 Delete request:", { buildingId, assetId });

    // Validation
    if (!buildingId || !assetId) {
      console.error("❌ Validation failed: Missing required parameters");
      return NextResponse.json({ error: "Building ID and Asset ID are required" }, { status: 400 });
    }

    // Delete the compliance asset record
    const { error: deleteError } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('building_id', parseInt(buildingId, 10))
      .eq('asset_id', assetId);

    if (deleteError) {
      console.error("❌ Database delete error:", deleteError);
      return NextResponse.json({ 
        error: "Failed to delete compliance record",
        details: deleteError.message
      }, { status: 500 });
    }

    console.log("✅ Compliance record deleted successfully");

    const responseData = {
      message: "Compliance record deleted successfully",
      data: {
        building_id: buildingId,
        asset_id: assetId
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 Compliance record deletion completed");
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Delete compliance record error:", error);
    return NextResponse.json({ 
      error: "Internal server error while deleting record",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 