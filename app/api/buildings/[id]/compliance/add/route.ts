import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const buildingId = params.id;
    const { asset_id } = await request.json();

    if (!buildingId || !asset_id) {
      return NextResponse.json({ error: "Building ID and asset ID are required" }, { status: 400 });
    }

    // Check if this asset is already added to this building
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("building_compliance_assets")
      .select("id")
      .eq("building_id", buildingId)
      .eq("asset_id", asset_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError;
    }

    if (existing) {
      return NextResponse.json({ error: "Asset already added to building" }, { status: 409 });
    }

    // Add the compliance asset to the building
    const { data, error } = await supabaseAdmin
      .from("building_compliance_assets")
      .insert({
        building_id: buildingId,
        asset_id: asset_id,
        status: "pending"
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error adding compliance asset:", error);
    return NextResponse.json(
      { error: "Failed to add compliance asset" },
      { status: 500 }
    );
  }
}
