import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: "Unauthorized",
        userError: userError?.message 
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');

    if (!buildingId) {
      return NextResponse.json({ 
        error: "Building ID is required" 
      }, { status: 400 });
    }

    // Test building fetch
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .maybeSingle();

    if (buildingError) {
      return NextResponse.json({ 
        error: "Database error",
        details: buildingError.message 
      }, { status: 500 });
    }

    if (!building) {
      return NextResponse.json({ 
        error: "Building not found",
        buildingId: buildingId 
      }, { status: 404 });
    }

    // Test compliance assets fetch
    const { data: assets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('*')
      .limit(5);

    return NextResponse.json({
      success: true,
      building: {
        id: building.id,
        name: building.name,
        address: building.address
      },
      assetsCount: assets?.length || 0,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Test building error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 