import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from "next/headers";

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const buildingId = new URL(req.url).searchParams.get('buildingId');

    console.log('🔍 [Debug] Building ID:', buildingId);
    console.log('🔍 [Debug] User ID:', user.id);

    // Check if building exists
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single();

    console.log('🔍 [Debug] Building:', building, buildingError);

    // Check compliance assets table
    const { data: complianceAssets, error: complianceError } = await supabase
      .from('compliance_assets')
      .select('id, name, category')
      .limit(5);

    console.log('🔍 [Debug] Compliance Assets (sample):', complianceAssets, complianceError);

    // Check building compliance assets
    const { data: buildingComplianceAssets, error: bcaError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        compliance_asset_id,
        status,
        compliance_assets (name, category)
      `)
      .eq('building_id', buildingId)
      .limit(10);

    console.log('🔍 [Debug] Building Compliance Assets:', buildingComplianceAssets, bcaError);

    // Test simple query
    const { data: simpleTest, error: simpleError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .limit(1);

    console.log('🔍 [Debug] Simple query test:', simpleTest, simpleError);

    return NextResponse.json({
      success: true,
      debug: {
        user: { id: user.id, email: user.email },
        building: building || 'Not found',
        buildingError: buildingError?.message,
        complianceAssets: complianceAssets || [],
        complianceError: complianceError?.message,
        buildingComplianceAssets: buildingComplianceAssets || [],
        bcaError: bcaError?.message,
        simpleTest: simpleTest || [],
        simpleError: simpleError?.message
      }
    });

  } catch (error) {
    console.error("🔍 [Debug] Error:", error);
    return NextResponse.json(
      { 
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}