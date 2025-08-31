import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Investigating Ashwood House compliance data...');
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔐 User ID:', user.id);

    // 1. Check if Ashwood House exists
    const { data: buildings, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('name', 'Ashwood House');

    console.log('🏠 Buildings found:', buildings?.length || 0);
    if (buildings && buildings.length > 0) {
      console.log('🏠 Ashwood House details:', buildings[0]);
      console.log('🏠 User owns building:', buildings[0].user_id === user.id);
    }

    // 2. Check user's buildings
    const { data: userBuildings, error: userBuildingError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('user_id', user.id);

    console.log('🏠 User buildings found:', userBuildings?.length || 0);
    userBuildings?.forEach(building => {
      console.log(`🏠 Building: ${building.name} (${building.id})`);
    });

    // 3. Check compliance assets master table
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('id, name, category, frequency_months');

    console.log('📋 Compliance assets in master table:', complianceAssets?.length || 0);

    // 4. Check building compliance assets for Ashwood House
    if (buildings && buildings.length > 0) {
      const ashwoodId = buildings[0].id;
      
      const { data: buildingAssets, error: buildingAssetsError } = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          compliance_assets (
            name,
            category,
            description
          )
        `)
        .eq('building_id', ashwoodId);

      console.log('📋 Building compliance assets for Ashwood:', buildingAssets?.length || 0);
      buildingAssets?.forEach(asset => {
        console.log(`📋 Asset: ${asset.compliance_assets?.name} - Status: ${asset.status}`);
      });

      // 5. Test the overview query manually
      const { data: overviewData, error: overviewError } = await supabase
        .from('building_compliance_assets')
        .select(`
          building_id,
          status,
          next_due_date,
          compliance_assets (
            name,
            category,
            description
          )
        `)
        .eq('building_id', ashwoodId);

      console.log('📊 Overview query results:', overviewData?.length || 0);
    }

    // 6. Test the RPC function
    let rpcResult = null;
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_compliance_overview', { user_uuid: user.id });
      
      if (rpcError) {
        console.log('❌ RPC function error:', rpcError);
      } else {
        console.log('✅ RPC function works, returned:', rpcData?.length || 0, 'buildings');
        rpcResult = rpcData;
      }
    } catch (rpcErr) {
      console.log('❌ RPC function does not exist or failed:', rpcErr);
    }

    // 7. Check for database function existence
    const { data: functions, error: functionsError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'get_user_compliance_overview');

    console.log('🔧 Database function exists:', functions?.length > 0);

    return NextResponse.json({
      success: true,
      debug: {
        user_id: user.id,
        ashwood_buildings: buildings?.length || 0,
        user_buildings: userBuildings?.length || 0,
        master_assets: complianceAssets?.length || 0,
        building_assets: buildings?.length > 0 ? 'checked' : 'skipped',
        rpc_function_exists: functions?.length > 0,
        rpc_result_count: rpcResult?.length || 0,
      },
      data: {
        buildings: buildings || [],
        userBuildings: userBuildings || [],
        complianceAssets: complianceAssets || [],
        rpcResult: rpcResult || []
      }
    });

  } catch (error) {
    console.error('❌ Debug API error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}