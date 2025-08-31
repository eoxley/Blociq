import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // Test 1: Check if compliance_assets exist
    const { data: assets, error: assetsError } = await supabaseAdmin
      .from("compliance_assets")
      .select("id, name, category")
      .limit(5);
    
    if (assetsError) {
      return NextResponse.json({ error: "Assets error: " + assetsError.message }, { status: 500 });
    }

    // Test 2: Check if any building_compliance_assets exist
    const { data: buildingAssets, error: buildingAssetsError } = await supabaseAdmin
      .from("building_compliance_assets")
      .select(`
        id,
        building_id,
        compliance_asset_id,
        status,
        compliance_assets (
          id,
          name,
          category
        )
      `)
      .limit(5);
    
    if (buildingAssetsError) {
      return NextResponse.json({ error: "Building assets error: " + buildingAssetsError.message }, { status: 500 });
    }

    // Test 3: Check if any buildings exist
    const { data: buildings, error: buildingsError } = await supabaseAdmin
      .from("buildings")
      .select("id, name")
      .limit(5);
    
    if (buildingsError) {
      return NextResponse.json({ error: "Buildings error: " + buildingsError.message }, { status: 500 });
    }

    return NextResponse.json({
      assets: assets || [],
      buildingAssets: buildingAssets || [],
      buildings: buildings || [],
      summary: {
        assetsCount: assets?.length || 0,
        buildingAssetsCount: buildingAssets?.length || 0,
        buildingsCount: buildings?.length || 0
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
