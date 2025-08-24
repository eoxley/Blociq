import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RX = /^[0-9a-fA-F-]{36}$/;

export async function POST(
  req: Request,
  { params }: { params: { buildingId: string } }
) {
  try {
    const buildingId = params.buildingId;
    
    // Validate building ID format
    if (!UUID_RX.test(buildingId)) {
      return NextResponse.json({ error: 'Invalid building ID format' }, { status: 400 });
    }

    const { asset_ids, status = 'pending', notes = '' } = await req.json();
    
    console.log('🔍 Compliance setup request:', {
      buildingId,
      assetIds: asset_ids,
      assetCount: asset_ids?.length || 0,
      status,
      notes
    });
    
    if (!Array.isArray(asset_ids) || !asset_ids.length) {
      return NextResponse.json({ error: 'No asset IDs provided' }, { status: 400 });
    }
    
    // Validate that the building exists
    const { data: building, error: buildingError } = await supabaseAdmin
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single();
    
    if (buildingError || !building) {
      console.error('❌ Building not found:', buildingId, buildingError);
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }
    
    console.log('✅ Building found:', building.name);
    
    // Validate that the compliance assets exist
    const { data: assets, error: assetsError } = await supabaseAdmin
      .from('compliance_assets')
      .select('id, title, category')
      .in('id', asset_ids);
    
    if (assetsError) {
      console.error('❌ Error fetching compliance assets:', assetsError);
      return NextResponse.json({ error: 'Failed to validate compliance assets' }, { status: 500 });
    }
    
    if (!assets || assets.length !== asset_ids.length) {
      console.error('❌ Some compliance assets not found:', {
        requested: asset_ids.length,
        found: assets?.length || 0
      });
      return NextResponse.json({ error: 'Some compliance assets not found' }, { status: 400 });
    }
    
    console.log('✅ All compliance assets validated:', assets.map(a => `${a.title} (${a.category})`));
    
    // Check for existing compliance assets for this building
    const { data: existingAssets, error: existingError } = await supabaseAdmin
      .from('building_compliance_assets')
      .select('compliance_asset_id')
      .eq('building_id', buildingId);
    
    if (existingError) {
      console.error('❌ Error checking existing assets:', existingError);
      return NextResponse.json({ error: 'Failed to check existing compliance setup' }, { status: 500 });
    }
    
    const existingAssetIds = new Set(existingAssets?.map(a => a.compliance_asset_id) || []);
    const newAssetIds = asset_ids.filter(id => !existingAssetIds.has(id));
    
    console.log('📝 New assets to add:', newAssetIds.length, 'Existing:', existingAssets?.length || 0);
    
    if (newAssetIds.length === 0) {
      return NextResponse.json({ 
        message: 'All compliance assets already configured for this building',
        existing: existingAssets?.length || 0,
        added: 0
      });
    }
    
    // Create new compliance asset rows
    const rows = newAssetIds.map((assetId: string) => ({ 
      building_id: buildingId, 
      compliance_asset_id: assetId,
      status: status,
      notes: notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    console.log('📝 Inserting compliance asset rows:', rows.length);
    
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from("building_compliance_assets")
      .insert(rows)
      .select();
    
    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      console.error('❌ Error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      throw insertError;
    }
    
    console.log('✅ Successfully inserted compliance assets:', insertedData?.length || 0);
    
    return NextResponse.json({ 
      success: true,
      message: `Compliance setup completed for ${building.name}`,
      building: building.name,
      existing: existingAssets?.length || 0,
      added: newAssetIds.length,
      total: (existingAssets?.length || 0) + newAssetIds.length,
      data: insertedData
    });
    
  } catch (e: any) { 
    console.error('❌ Compliance setup error:', e);
    console.error('❌ Error stack:', e.stack);
    
    return NextResponse.json({ 
      error: e.message || 'Unknown error occurred',
      details: e.details || e.hint || 'No additional details available',
      code: e.code || 'UNKNOWN_ERROR'
    }, { status: 500 }); 
  }
}

export async function GET(
  req: Request,
  { params }: { params: { buildingId: string } }
) {
  try {
    const buildingId = params.buildingId;
    
    // Validate building ID format
    if (!UUID_RX.test(buildingId)) {
      return NextResponse.json({ error: 'Invalid building ID format' }, { status: 400 });
    }

    console.log('🔍 Fetching compliance setup for building:', buildingId);
    
    // Get existing compliance setup for this building
    const { data: existingAssets, error: existingError } = await supabaseAdmin
      .from('building_compliance_assets')
      .select(`
        id,
        compliance_asset_id,
        status,
        notes,
        next_due_date,
        last_renewed_date,
        contractor,
        frequency_months,
        compliance_assets!inner(title, category, description)
      `)
      .eq('building_id', buildingId);
    
    if (existingError) {
      console.error('❌ Error fetching existing compliance setup:', existingError);
      return NextResponse.json({ error: 'Failed to fetch compliance setup' }, { status: 500 });
    }
    
    console.log('✅ Found compliance setup:', existingAssets?.length || 0, 'assets');
    
    return NextResponse.json({ 
      success: true,
      building_id: buildingId,
      assets: existingAssets || [],
      count: existingAssets?.length || 0
    });
    
  } catch (e: any) { 
    console.error('❌ Error fetching compliance setup:', e);
    
    return NextResponse.json({ 
      error: e.message || 'Unknown error occurred',
      details: e.details || e.hint || 'No additional details available'
    }, { status: 500 }); 
  }
}
