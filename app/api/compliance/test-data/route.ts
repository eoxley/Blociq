import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing compliance data...');
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

    // Test 1: Check compliance_assets table
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('*')
      .limit(10);

    console.log('📋 Compliance assets:', complianceAssets?.length || 0);

    // Test 2: Check buildings table
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .limit(10);

    console.log('🏢 Buildings:', buildings?.length || 0);

    // Test 3: Check building_compliance_assets table
    const { data: buildingAssets, error: buildingAssetsError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        next_due_date,
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
      .limit(10);

    console.log('🔗 Building compliance assets:', buildingAssets?.length || 0);

    // Test 4: Check user's buildings specifically
    const { data: userBuildings, error: userBuildingsError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('user_id', user.id);

    console.log('👤 User buildings:', userBuildings?.length || 0);

    // Test 5: Check building_members table
    const { data: buildingMembers, error: buildingMembersError } = await supabase
      .from('building_members')
      .select('building_id, user_id, buildings!building_id(id, name)')
      .eq('user_id', user.id);

    console.log('👥 Building members:', buildingMembers?.length || 0);

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
        buildings: {
          count: buildings?.length || 0,
          data: buildings || [],
          error: buildingsError?.message
        },
        buildingAssets: {
          count: buildingAssets?.length || 0,
          data: buildingAssets || [],
          error: buildingAssetsError?.message
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
        }
      }
    });

  } catch (error) {
    console.error('❌ Test data API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
