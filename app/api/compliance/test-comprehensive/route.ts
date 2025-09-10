import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Running comprehensive compliance test...');
    const supabase = createClient(cookies());
    
    // Get the current user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required',
        user: null
      }, { status: 401 });
    }

    const user = session.user;

    console.log('🔐 User authenticated:', user.id);

    // Test 1: Check if we have compliance assets
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('*')
      .limit(5);

    console.log('📋 Compliance assets available:', complianceAssets?.length || 0);

    // Test 2: Check user's buildings
    const { data: userBuildings, error: userBuildingsError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('user_id', user.id);

    console.log('🏢 User buildings:', userBuildings?.length || 0);

    // Test 3: Check building_members for additional access
    const { data: buildingMembers, error: buildingMembersError } = await supabase
      .from('building_members')
      .select('building_id, user_id, buildings!building_id(id, name)')
      .eq('user_id', user.id);

    console.log('👥 Building memberships:', buildingMembers?.length || 0);

    // Test 4: Get all accessible buildings
    const allBuildingIds = [
      ...(userBuildings || []).map(b => b.id),
      ...(buildingMembers || []).map(m => m.building_id)
    ];

    console.log('🔗 All accessible building IDs:', allBuildingIds);

    // Test 5: Check building_compliance_assets for these buildings
    const { data: buildingAssets, error: buildingAssetsError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        last_carried_out,
        next_due_date,
        notes,
        compliance_assets!asset_id (
          name,
          category,
          description
        ),
        buildings!building_id (
          id,
          name
        )
      `)
      .in('building_id', allBuildingIds)
      .order('next_due_date', { ascending: true });

    console.log('🔗 Building compliance assets:', buildingAssets?.length || 0);

    // Test 6: Test the detailed API endpoint
    let detailedApiResult = null;
    try {
      const detailedResponse = await fetch(`${request.nextUrl.origin}/api/portfolio/compliance/detailed`);
      if (detailedResponse.ok) {
        detailedApiResult = await detailedResponse.json();
        console.log('✅ Detailed API working:', detailedApiResult.success);
      } else {
        console.log('❌ Detailed API failed:', detailedResponse.status);
      }
    } catch (apiError) {
      console.log('❌ Detailed API error:', apiError);
    }

    // Test 7: Test the overview API endpoint
    let overviewApiResult = null;
    try {
      const overviewResponse = await fetch(`${request.nextUrl.origin}/api/compliance/overview`);
      if (overviewResponse.ok) {
        overviewApiResult = await overviewResponse.json();
        console.log('✅ Overview API working:', overviewApiResult.success);
      } else {
        console.log('❌ Overview API failed:', overviewResponse.status);
      }
    } catch (apiError) {
      console.log('❌ Overview API error:', apiError);
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email
        },
        complianceAssets: {
          count: complianceAssets?.length || 0,
          data: complianceAssets || [],
          error: assetsError?.message
        },
        userBuildings: {
          count: userBuildings?.length || 0,
          data: userBuildings || [],
          error: userBuildingsError?.message
        },
        buildingMembers: {
          count: buildingMembers?.length || 0,
          data: buildingMembers || [],
          error: buildingMembersError?.message
        },
        allAccessibleBuildings: {
          count: allBuildingIds.length,
          ids: allBuildingIds
        },
        buildingAssets: {
          count: buildingAssets?.length || 0,
          data: buildingAssets || [],
          error: buildingAssetsError?.message
        },
        detailedApi: {
          working: detailedApiResult?.success || false,
          dataCount: detailedApiResult?.data?.length || 0,
          error: detailedApiResult?.error
        },
        overviewApi: {
          working: overviewApiResult?.success || false,
          buildingsCount: overviewApiResult?.data?.overview?.length || 0,
          error: overviewApiResult?.error
        }
      },
      summary: {
        hasComplianceAssets: (complianceAssets?.length || 0) > 0,
        hasUserBuildings: (userBuildings?.length || 0) > 0,
        hasBuildingAssets: (buildingAssets?.length || 0) > 0,
        detailedApiWorking: detailedApiResult?.success || false,
        overviewApiWorking: overviewApiResult?.success || false,
        readyForTesting: (complianceAssets?.length || 0) > 0 && (buildingAssets?.length || 0) > 0
      }
    });

  } catch (error) {
    console.error('❌ Comprehensive test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
