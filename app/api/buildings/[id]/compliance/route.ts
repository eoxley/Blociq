import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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

    // Verify user has access to this building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('id', buildingId)
      .single();

    if (buildingError || !building) {
      return NextResponse.json({ success: false, error: 'Building not found' }, { status: 404 });
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

    // Get building compliance assets
    const { data: assets, error: assetsError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_inspections (
          id,
          inspection_date,
          next_due_date,
          status,
          notes,
          document_url
        )
      `)
      .eq('building_id', buildingId)
      .order('category, asset_name');

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch compliance assets',
        details: assetsError.message 
      }, { status: 500 });
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
      }
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
      return NextResponse.json({ success: false, error: 'Building not found' }, { status: 404 });
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
