import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing compliance data...');
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required',
        debug: {
          authError: authError?.message,
          user: user ? 'User exists' : 'No user'
        }
      }, { status: 401 });
    }

    console.log('🔐 User authenticated:', user.id);

    // Test 1: Check buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name')
      .limit(5);

    console.log('🏢 Buildings query result:', { buildings, buildingsError });

    // Test 2: Check compliance assets
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('id, name, category, description')
      .limit(10);

    console.log('📋 Compliance assets query result:', { complianceAssets, assetsError });

    // Test 3: Check building compliance assets
    const { data: buildingComplianceAssets, error: bcaError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        next_due_date,
        notes,
        compliance_assets (
          id,
          name,
          category,
          description
        )
      `)
      .limit(10);

    console.log('🔗 Building compliance assets query result:', { buildingComplianceAssets, bcaError });

    // Test 4: Try the full query that the overview API uses
    const buildingIds = buildings?.map(b => b.id) || [];
    const { data: fullQuery, error: fullQueryError } = await supabase
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
      .in('building_id', buildingIds);

    console.log('🔍 Full query result:', { fullQuery, fullQueryError });

    return NextResponse.json({
      success: true,
      message: 'Compliance data test completed',
      data: {
        user: {
          id: user.id,
          email: user.email
        },
        buildings: {
          count: buildings?.length || 0,
          data: buildings,
          error: buildingsError?.message
        },
        complianceAssets: {
          count: complianceAssets?.length || 0,
          data: complianceAssets,
          error: assetsError?.message
        },
        buildingComplianceAssets: {
          count: buildingComplianceAssets?.length || 0,
          data: buildingComplianceAssets,
          error: bcaError?.message
        },
        fullQuery: {
          count: fullQuery?.length || 0,
          data: fullQuery,
          error: fullQueryError?.message
        }
      }
    });

  } catch (error) {
    console.error('❌ Compliance test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
