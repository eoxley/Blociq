import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { assignBSAAssetsToHRB } from "@/lib/bsaAssetAssignment";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    console.log("🏗️ API: Assigning BSA assets to HRB building...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    const { buildingId } = await params;

    if (!buildingId) {
      return NextResponse.json({ 
        error: "Missing required field: buildingId" 
      }, { status: 400 });
    }

    // Verify the building exists and is marked as HRB
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("id, name, is_hrb")
      .eq("id", parseInt(buildingId))
      .single();

    if (buildingError || !building) {
      console.error("❌ Building not found:", buildingError);
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    if (!building.is_hrb) {
      return NextResponse.json({ 
        error: "Building is not marked as High-Risk Building (HRB)" 
      }, { status: 400 });
    }

    console.log(`✅ Building verified as HRB: ${building.name}`);

    // Assign BSA assets
    const result = await assignBSAAssetsToHRB(buildingId, user.id);

    const responseData = {
      message: "BSA assets assignment completed",
      building: {
        id: building.id,
        name: building.name,
        is_hrb: building.is_hrb
      },
      assignment: result,
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 BSA assets assignment API completed successfully");
    console.log("📊 Assignment result:", result);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ BSA assets assignment API error:", error);
    return NextResponse.json({ 
      error: "Internal server error during BSA assets assignment",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    console.log("🔍 API: Getting BSA assets summary...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { buildingId } = await params;

    if (!buildingId) {
      return NextResponse.json({ 
        error: "Missing required field: buildingId" 
      }, { status: 400 });
    }

    // Get BSA assets summary for the building
    const { data: bsaAssets, error } = await supabase
      .from('building_assets')
      .select(`
        *,
        compliance_items (
          id,
          name,
          category,
          frequency,
          assigned_to,
          notes
        )
      `)
      .eq('building_id', parseInt(buildingId))
      .in('compliance_items.name', [
        'Safety Case Report',
        'Safety Case Certificate', 
        'Resident Engagement Strategy',
        'Building Assessment Certificate',
        'Accountable Person ID Check',
        'Mandatory Occurrence Log'
      ])

    if (error) {
      console.error("❌ Error fetching BSA assets summary:", error);
      return NextResponse.json({ 
        error: "Failed to fetch BSA assets summary",
        details: error.message 
      }, { status: 500 });
    }

    const summary = {
      total: bsaAssets?.length || 0,
      missing: bsaAssets?.filter(asset => asset.status === 'missing').length || 0,
      compliant: bsaAssets?.filter(asset => asset.status === 'compliant').length || 0,
      overdue: bsaAssets?.filter(asset => asset.status === 'overdue').length || 0,
      assets: bsaAssets || []
    };

    const responseData = {
      message: "BSA assets summary retrieved successfully",
      building_id: buildingId,
      summary,
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString()
      }
    };

    console.log("✅ BSA assets summary API completed successfully");
    console.log("📊 Summary:", summary);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ BSA assets summary API error:", error);
    return NextResponse.json({ 
      error: "Internal server error during BSA assets summary retrieval",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 