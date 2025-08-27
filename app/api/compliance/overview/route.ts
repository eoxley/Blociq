import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's buildings and compliance overview
    let overview = [];
    try {
      // First try to use the database function if it exists
      const { data: functionResult, error: functionError } = await supabase
        .rpc('get_user_compliance_overview', { user_uuid: user.id });
      
      if (!functionError && functionResult) {
        overview = functionResult;
      } else {
        // Fallback: do the query manually
        console.log('Database function not found, using manual query fallback');
        
        // Get user's buildings
        const { data: buildings, error: buildingsError } = await supabase
          .from('buildings')
          .select('id, name')
          .or(`user_id.eq.${user.id},id.in.(select building_id from building_members where user_id = '${user.id}')`);
        
        if (buildingsError) {
          console.error('Error fetching buildings:', buildingsError);
          throw buildingsError;
        }
        
        // Get compliance data for each building
        const buildingIds = buildings.map(b => b.id);
        if (buildingIds.length > 0) {
          const { data: complianceData, error: complianceError } = await supabase
            .from('building_compliance_assets')
            .select('building_id, status')
            .in('building_id', buildingIds);
          
          if (complianceError) {
            console.error('Error fetching compliance data:', complianceError);
            throw complianceError;
          }
          
          // Calculate overview for each building
          overview = buildings.map(building => {
            const buildingAssets = complianceData.filter(ca => ca.building_id === building.id);
            return {
              building_id: building.id,
              building_name: building.name,
              total_assets: buildingAssets.length,
              compliant_assets: buildingAssets.filter(ca => ca.status === 'compliant').length,
              overdue_assets: buildingAssets.filter(ca => ca.status === 'overdue').length,
              due_soon_assets: buildingAssets.filter(ca => ca.status === 'due_soon').length,
              pending_assets: buildingAssets.filter(ca => ca.status === 'pending').length
            };
          });
        }
      }
    } catch (overviewError) {
      console.error('Error fetching compliance overview:', overviewError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch compliance overview',
        details: overviewError instanceof Error ? overviewError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Get compliance templates for reference
    const { data: templates, error: templatesError } = await supabase
      .from('compliance_templates')
      .select('*')
      .order('category, asset_name');

    if (templatesError) {
      console.error('Error fetching compliance templates:', templatesError);
    }

    // Calculate summary statistics
    const summary = {
      totalBuildings: overview?.length || 0,
      totalAssets: overview?.reduce((sum, building) => sum + (building.total_assets || 0), 0) || 0,
      compliantAssets: overview?.reduce((sum, building) => sum + (building.compliant_assets || 0), 0) || 0,
      overdueAssets: overview?.reduce((sum, building) => sum + (building.overdue_assets || 0), 0) || 0,
      dueSoonAssets: overview?.reduce((sum, building) => sum + (building.due_soon_assets || 0), 0) || 0,
      pendingAssets: overview?.reduce((sum, building) => sum + (building.pending_assets || 0), 0) || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: overview || [],
        templates: templates || [],
        summary,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Compliance overview API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
