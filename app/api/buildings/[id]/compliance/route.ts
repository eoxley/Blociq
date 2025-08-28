import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { safeQuery, ensureRequiredTables } from '@/lib/database-setup';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const buildingId = params.id;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure required tables exist
    await ensureRequiredTables();

    // Verify user has access to this building with safe query
    const { data: building, error: buildingError, tableExists: buildingsTableExists } = await safeQuery(
      'buildings',
      async () => {
        const result = await supabase
          .from('buildings')
          .select('id, name, user_id')
          .eq('id', buildingId)
          .single();
        return result;
      }
    );

    // Handle case where buildings table doesn't exist
    if (!buildingsTableExists) {
      console.log('🏢 buildings table not found, returning empty compliance data');
      return NextResponse.json({
        success: true,
        data: {
          assets: [],
          config: null,
          templates: [],
          summary: {
            totalAssets: 0,
            compliantAssets: 0,
            overdueAssets: 0,
            dueSoonAssets: 0,
            pendingAssets: 0,
          }
        },
        buildingStatus: 'database_empty',
        message: 'No buildings table found - database may be empty'
      });
    }

    // Handle case where building doesn't exist - return empty data instead of error
    if (buildingError || !building) {
      console.log(`Building ${buildingId} not found, returning empty compliance data`);
      return NextResponse.json({
        success: true,
        data: {
          assets: [],
          config: null,
          templates: [],
          summary: {
            totalAssets: 0,
            compliantAssets: 0,
            overdueAssets: 0,
            dueSoonAssets: 0,
            pendingAssets: 0,
          }
        },
        buildingStatus: 'not_found'
      });
    }

    // Check if user owns the building or is a member
    const { data: memberCheck, error: memberError } = await supabase
      .from('building_members')
      .select('id')
      .eq('building_id', buildingId)
      .eq('user_id', user.id)
      .single();

    if (building.user_id !== user.id && (memberError || !memberCheck)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get building compliance assets with safe query
    const { data: assets, error: assetsError, tableExists: complianceTableExists } = await safeQuery(
      'building_compliance_assets',
      async () => {
        const result = await supabase
          .from('building_compliance_assets')
          .select(`
            id,
            building_id,
            status,
            next_due_date,
            last_renewed_date,
            notes,
            contractor,
            compliance_assets (
              id,
              name,
              category,
              description,
              frequency_months
            )
          `)
          .eq('building_id', buildingId)
          .order('compliance_assets.category, compliance_assets.name');
        return result;
      }
    );

    if (!complianceTableExists) {
      console.log('🏢 building_compliance_assets table not found, returning empty data');
      return NextResponse.json({
        success: true,
        data: {
          assets: [],
          config: null,
          templates: [],
          summary: {
            totalAssets: 0,
            compliantAssets: 0,
            overdueAssets: 0,
            dueSoonAssets: 0,
            pendingAssets: 0,
          }
        },
        buildingStatus: 'matched',
        warning: 'Compliance table not found, returning empty data',
        message: 'Database setup incomplete - compliance data unavailable'
      });
    }

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError);
      // Return empty assets instead of error
      return NextResponse.json({
        success: true,
        data: {
          assets: [],
          config: null,
          templates: [],
          summary: {
            totalAssets: 0,
            compliantAssets: 0,
            overdueAssets: 0,
            dueSoonAssets: 0,
            pendingAssets: 0,
          }
        },
        buildingStatus: 'matched',
        warning: 'Failed to fetch compliance assets, returning empty data'
      });
    }

    // Get building compliance configuration
    const { data: config, error: configError } = await supabase
      .from('building_compliance_config')
      .select('*')
      .eq('building_id', buildingId)
      .single();

    // Get compliance templates for reference
    const { data: templates, error: templatesError } = await supabase
      .from('compliance_templates')
      .select('*')
      .order('category, asset_name');

    if (templatesError) {
      console.error('Error fetching compliance templates:', templatesError);
    }

    // Calculate building-specific summary
    const summary = {
      totalAssets: assets?.length || 0,
      compliantAssets: assets?.filter(asset => asset.status === 'compliant').length || 0,
      overdueAssets: assets?.filter(asset => asset.status === 'overdue').length || 0,
      dueSoonAssets: assets?.filter(asset => asset.status === 'due_soon').length || 0,
      pendingAssets: assets?.filter(asset => asset.status === 'pending').length || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        building: {
          id: building.id,
          name: building.name
        },
        assets: assets || [],
        config: config || { is_hrb: false, auto_notifications_enabled: true },
        templates: templates || [],
        summary,
        lastUpdated: new Date().toISOString()
      },
      buildingStatus: 'matched'
    });

  } catch (error) {
    console.error('Building compliance API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const buildingId = params.id;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('id', buildingId)
      .single();

    if (buildingError || !building) {
      return NextResponse.json({ 
        success: false, 
        error: 'Building not found',
        buildingStatus: 'not_found'
      }, { status: 404 });
    }

    // Check if user owns the building or is a member
    const { data: memberCheck, error: memberError } = await supabase
      .from('building_members')
      .select('id')
      .eq('building_id', buildingId)
      .eq('user_id', user.id)
      .single();

    if (building.user_id !== user.id && (memberError || !memberCheck)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { asset_type, asset_name, category, description, inspection_frequency, is_required, priority } = body;

    if (!asset_type || !asset_name || !category) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: asset_type, asset_name, category' 
      }, { status: 400 });
    }

    // Insert new compliance asset
    const { data: newAsset, error: insertError } = await supabase
      .from('compliance_assets')
      .insert({
        building_id: buildingId,
        user_id: user.id,
        asset_type,
        asset_name,
        category,
        description,
        inspection_frequency: inspection_frequency || 'annual',
        is_required: is_required !== undefined ? is_required : true,
        priority: priority || 'medium',
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting compliance asset:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create compliance asset',
        details: insertError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: newAsset
    });

  } catch (error) {
    console.error('Building compliance POST API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
