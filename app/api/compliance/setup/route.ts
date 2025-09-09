import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from "next/headers";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { buildingId } = await req.json();

    if (!buildingId) {
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    console.log('🔧 [Setup] Setting up compliance assets for building:', buildingId);

    // First, ensure we have some basic compliance assets
    const basicAssets = [
      {
        id: 'fire-risk-assessment',
        name: 'Fire Risk Assessment',
        category: 'Fire Safety',
        description: 'Annual fire risk assessment to identify and mitigate fire hazards',
        frequency_months: 12
      },
      {
        id: 'electrical-safety-check',
        name: 'Electrical Safety Check',
        category: 'Electrical Safety', 
        description: 'Periodic inspection and testing of electrical installations',
        frequency_months: 60
      },
      {
        id: 'gas-safety-check',
        name: 'Gas Safety Check',
        category: 'Gas Safety',
        description: 'Annual gas safety inspection and certification',
        frequency_months: 12
      }
    ];

    // Upsert basic compliance assets
    const { error: assetUpsertError } = await supabase
      .from('compliance_assets')
      .upsert(basicAssets, { onConflict: 'id' });

    if (assetUpsertError) {
      console.error('🔧 [Setup] Asset upsert error:', assetUpsertError);
    } else {
      console.log('🔧 [Setup] Basic compliance assets created/updated');
    }

    // Now create building compliance assets for this building
    const buildingAssets = basicAssets.map(asset => ({
      building_id: buildingId,
      compliance_asset_id: asset.id,
      status: 'not_applied',
      next_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      notes: 'Auto-created during setup',
      frequency_months: asset.frequency_months
    }));

    const { data: createdBuildingAssets, error: buildingAssetError } = await supabase
      .from('building_compliance_assets')
      .upsert(buildingAssets, { 
        onConflict: 'building_id,compliance_asset_id',
        ignoreDuplicates: true 
      })
      .select();

    if (buildingAssetError) {
      console.error('🔧 [Setup] Building asset error:', buildingAssetError);
      return NextResponse.json({ 
        error: "Failed to setup building assets",
        details: buildingAssetError.message 
      }, { status: 500 });
    }

    console.log('🔧 [Setup] Created building assets:', createdBuildingAssets?.length || 0);

    return NextResponse.json({
      message: `Successfully setup compliance assets for building`,
      assetsCreated: createdBuildingAssets?.length || 0,
      success: true
    });

  } catch (error) {
    console.error("🔧 [Setup] Error:", error);
    return NextResponse.json(
      { 
        error: "Setup failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}