import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verifying compliance system...');
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required',
        step: 'authentication'
      }, { status: 401 });
    }

    console.log('✅ Step 1: User authenticated:', user.id);

    // Test 1: Check buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name')
      .limit(5);

    if (buildingsError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch buildings',
        step: 'buildings',
        details: buildingsError.message
      });
    }

    console.log('✅ Step 2: Found', buildings?.length || 0, 'buildings');

    // Test 2: Check compliance assets
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('id, name, category, description')
      .limit(5);

    if (assetsError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch compliance assets',
        step: 'compliance_assets',
        details: assetsError.message
      });
    }

    console.log('✅ Step 3: Found', complianceAssets?.length || 0, 'compliance assets');

    // Test 3: Check building compliance assets with proper join
    const buildingIds = buildings?.map(b => b.id) || [];
    const { data: buildingComplianceAssets, error: bcaError } = await supabase
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
        )
      `)
      .in('building_id', buildingIds)
      .limit(10);

    if (bcaError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch building compliance assets',
        step: 'building_compliance_assets',
        details: bcaError.message
      });
    }

    console.log('✅ Step 4: Found', buildingComplianceAssets?.length || 0, 'building compliance assets');

    // Test 4: Test the overview API logic
    const overview = buildings?.map(building => {
      const buildingAssets = buildingComplianceAssets?.filter(ca => ca.building_id === building.id) || [];
      return {
        building_id: building.id,
        building_name: building.name,
        total_assets: buildingAssets.length,
        compliant_assets: buildingAssets.filter(ca => ca.status === 'compliant').length,
        overdue_assets: buildingAssets.filter(ca => ca.status === 'overdue').length,
        due_soon_assets: buildingAssets.filter(ca => {
          if (!ca.next_due_date) return false;
          const dueDate = new Date(ca.next_due_date);
          const now = new Date();
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilDue <= 30 && daysUntilDue > 0;
        }).length,
        pending_assets: buildingAssets.filter(ca => ca.status === 'pending').length
      };
    }) || [];

    console.log('✅ Step 5: Generated overview for', overview.length, 'buildings');

    // Calculate summary
    const summary = {
      totalBuildings: overview.length,
      totalAssets: overview.reduce((sum, building) => sum + (building.total_assets || 0), 0),
      compliantAssets: overview.reduce((sum, building) => sum + (building.compliant_assets || 0), 0),
      overdueAssets: overview.reduce((sum, building) => sum + (building.overdue_assets || 0), 0),
      dueSoonAssets: overview.reduce((sum, building) => sum + (building.due_soon_assets || 0), 0),
      pendingAssets: overview.reduce((sum, building) => sum + (building.pending_assets || 0), 0),
    };

    console.log('✅ Step 6: Calculated summary:', summary);

    return NextResponse.json({
      success: true,
      message: 'Compliance system verification completed successfully',
      data: {
        user: {
          id: user.id,
          email: user.email
        },
        buildings: {
          count: buildings?.length || 0,
          sample: buildings?.slice(0, 3) || []
        },
        complianceAssets: {
          count: complianceAssets?.length || 0,
          sample: complianceAssets?.slice(0, 3) || []
        },
        buildingComplianceAssets: {
          count: buildingComplianceAssets?.length || 0,
          sample: buildingComplianceAssets?.slice(0, 3) || []
        },
        overview: {
          count: overview.length,
          sample: overview.slice(0, 3)
        },
        summary
      }
    });

  } catch (error) {
    console.error('❌ Compliance verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      step: 'exception',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
