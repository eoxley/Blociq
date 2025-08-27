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
    const { data: overview, error: overviewError } = await supabase
      .rpc('get_user_compliance_overview', { user_uuid: user.id });

    if (overviewError) {
      console.error('Error fetching compliance overview:', overviewError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch compliance overview',
        details: overviewError.message 
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
