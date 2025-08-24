import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const buildingId = params.id;
    
    if (!buildingId) {
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("building_compliance_assets")
      .select("compliance_asset_id")
      .eq("building_id", buildingId);
      
    if (error) {
      console.error('Error fetching selected compliance assets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      asset_ids: (data || []).map(d => d.compliance_asset_id),
      count: data?.length || 0
    });
  } catch (error: any) {
    console.error("Error in selected compliance assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch selected compliance assets" },
      { status: 500 }
    );
  }
}
