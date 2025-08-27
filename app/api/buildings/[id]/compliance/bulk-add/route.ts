import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { asset_ids } = await req.json();
    
    console.log('🔍 Bulk add compliance assets request:', {
      buildingId: params.id,
      assetIds: asset_ids,
      assetCount: asset_ids?.length || 0
    });
    
    if (!Array.isArray(asset_ids) || !asset_ids.length) {
      console.log('⚠️ No asset IDs provided or invalid format');
      return NextResponse.json({ inserted: 0 });
    }
    
    // Validate that the building exists
    const { data: building, error: buildingError } = await supabaseAdmin
      .from('buildings')
      .select('id, name')
      .eq('id', params.id)
      .single();
    
    if (buildingError || !building) {
      console.error('❌ Building not found:', params.id, buildingError);
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }
    
    console.log('✅ Building found:', building.name);
    
    // Validate that the compliance assets exist
    const { data: assets, error: assetsError } = await supabaseAdmin
      .from('building_compliance_assets')
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
    
    // Create rows with correct column names based on the actual database schema
    const rows = asset_ids.map((assetId: string) => ({ 
      building_id: params.id, 
      compliance_asset_id: assetId,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    console.log('📝 Inserting compliance asset rows:', rows.length);
    
    const { data: insertedData, error } = await supabaseAdmin
      .from("building_compliance_assets")
      .insert(rows)
      .select();
    
    if (error) {
      console.error('❌ Database insert error:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('✅ Successfully inserted compliance assets:', insertedData?.length || 0);
    
    return NextResponse.json({ 
      inserted: rows.length,
      data: insertedData
    });
    
  } catch (e: any) { 
    console.error('❌ Bulk add compliance assets error:', e);
    console.error('❌ Error stack:', e.stack);
    
    // Return more detailed error information for debugging
    return NextResponse.json({ 
      error: e.message || 'Unknown error occurred',
      details: e.details || e.hint || 'No additional details available',
      code: e.code || 'UNKNOWN_ERROR'
    }, { status: 500 }); 
  }
}
