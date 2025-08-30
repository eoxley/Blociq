import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('⚠️ User not authenticated, returning empty data');
      return NextResponse.json({ 
        success: true, 
        data: {
          assets: [],
          lastUpdated: new Date().toISOString()
        }
      });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    console.log('🏢 Building ID requested:', buildingId);
    console.log('🏷️ Category requested:', category);
    console.log('📊 Status requested:', status);

    // If no building ID provided, return empty array instead of error
    if (!buildingId) {
      console.log('⚠️ No building ID provided, returning empty array');
      return NextResponse.json({ 
        success: true, 
        data: {
          assets: [],
          lastUpdated: new Date().toISOString()
        }
      });
    }

    // Build query
    let query = supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        status,
        next_due_date,
        last_renewed_date,
        notes,
        contractor,
        buildings (
          id,
          name
        ),
        compliance_assets (
          id,
          name,
          category,
          description,
          frequency_months
        )
      `)
      .eq('building_id', buildingId);

    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: assets, error: assetsError } = await query.order('category').order('asset_name');

    if (assetsError) {
      console.error('❌ Error fetching compliance assets:', assetsError);
      // Return empty array instead of 500 error
      return NextResponse.json({ 
        success: true, 
        data: {
          assets: [],
          lastUpdated: new Date().toISOString()
        }
      });
    }

    console.log('✅ Compliance assets fetched successfully');
    return NextResponse.json({
      success: true,
      data: {
        assets: assets || [],
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Compliance assets GET API error:', error);
    // Return empty array instead of 500 error
    return NextResponse.json({ 
      success: true, 
      data: {
        assets: [],
        lastUpdated: new Date().toISOString()
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    
    // Handle bulk asset selection (from setup wizard)
    if (body.asset_ids && Array.isArray(body.asset_ids)) {
      const { building_id, asset_ids } = body;

      if (!building_id || !asset_ids.length) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing required fields: building_id and asset_ids array' 
        }, { status: 400 });
      }

      // Verify user has access to this building
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select('id')
        .eq('id', building_id)
        .single();

      if (buildingError || !building) {
        return NextResponse.json({ success: false, error: 'Building not found' }, { status: 404 });
      }

      // Get existing assets to avoid duplicates
      const { data: existingAssets, error: existingError } = await supabase
        .from('building_compliance_assets')
        .select('compliance_asset_id')
        .eq('building_id', building_id)

      if (existingError) {
        console.error('Error fetching existing assets:', existingError)
      }

      const existingAssetIds = new Set(existingAssets?.map(ea => ea.compliance_asset_id) || [])
      const newAssetIds = asset_ids.filter(id => !existingAssetIds.has(id))

      if (newAssetIds.length === 0) {
        return NextResponse.json({ 
          success: true, 
          message: 'No new assets to add',
          added_count: 0
        })
      }

      // Create building compliance asset records
      const assetsToInsert = newAssetIds.map(asset_id => ({
        building_id,
        compliance_asset_id: asset_id,
        status: 'not_applied',
        next_due_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: insertError } = await supabase
        .from('building_compliance_assets')
        .insert(assetsToInsert)

      if (insertError) {
        console.error('Error inserting compliance assets:', insertError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to add compliance assets',
          details: insertError.message 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Successfully added ${newAssetIds.length} compliance assets`,
        added_count: newAssetIds.length
      })
    }

    // Handle single asset creation (legacy functionality)
    const { building_id, asset_type, asset_name, category, description, inspection_frequency, is_required, priority, next_due_date } = body;

    if (!building_id || !asset_type || !asset_name || !category) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: building_id, asset_type, asset_name, category' 
      }, { status: 400 });
    }

    // Verify user has access to this building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('id', building_id)
      .single();

    if (buildingError || !building) {
      return NextResponse.json({ success: false, error: 'Building not found' }, { status: 404 });
    }

    // Check if user owns the building or is a member
    const { data: memberCheck, error: memberError } = await supabase
      .from('building_members')
      .select('id')
      .eq('building_id', building_id)
      .eq('user_id', user.id)
      .single();

    if (building.user_id !== user.id && (memberError || !memberCheck)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Insert new compliance asset
    const { data: newAsset, error: insertError } = await supabase
      .from('building_compliance_assets')
      .insert({
        building_id,
        user_id: user.id,
        asset_type,
        asset_name,
        category,
        description,
        inspection_frequency: inspection_frequency || 'annual',
        is_required: is_required !== undefined ? is_required : true,
        priority: priority || 'medium',
        next_due_date,
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
    console.error('Compliance assets POST API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { id, asset_name, description, inspection_frequency, is_required, priority, next_due_date, last_inspection_date, status } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required field: id' 
      }, { status: 400 });
    }

    // Get the asset to verify ownership
    const { data: asset, error: assetError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('id', id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Verify user has access to this asset's building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('id', asset.building_id)
      .single();

    if (buildingError || !building) {
      return NextResponse.json({ success: false, error: 'Building not found' }, { status: 404 });
    }

    // Check if user owns the building or is a member
    const { data: memberCheck, error: memberError } = await supabase
      .from('building_members')
      .select('id')
      .eq('building_id', asset.building_id)
      .eq('user_id', user.id)
      .single();

    if (building.user_id !== user.id && (memberError || !memberCheck)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Update the compliance asset
    const { data: updatedAsset, error: updateError } = await supabase
      .from('building_compliance_assets')
      .update({
        asset_name: asset_name || asset.asset_name,
        description: description !== undefined ? description : asset.description,
        inspection_frequency: inspection_frequency || asset.inspection_frequency,
        is_required: is_required !== undefined ? is_required : asset.is_required,
        priority: priority || asset.priority,
        next_due_date: next_due_date || asset.next_due_date,
        last_inspection_date: last_inspection_date || asset.last_inspection_date,
        status: status || asset.status
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating compliance asset:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update compliance asset',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedAsset
    });

  } catch (error) {
    console.error('Compliance assets PUT API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required field: id' 
      }, { status: 400 });
    }

    // Get the asset to verify ownership
    const { data: asset, error: assetError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('id', id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Verify user has access to this asset's building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('id', asset.building_id)
      .single();

    if (buildingError || !building) {
      return NextResponse.json({ success: false, error: 'Building not found' }, { status: 404 });
    }

    // Check if user owns the building or is a member
    const { data: memberCheck, error: memberError } = await supabase
      .from('building_members')
      .select('id')
      .eq('building_id', asset.building_id)
      .eq('user_id', user.id)
      .single();

    if (building.user_id !== user.id && (memberError || !memberCheck)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Delete the compliance asset
    const { error: deleteError } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting compliance asset:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete compliance asset',
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance asset deleted successfully'
    });

  } catch (error) {
    console.error('Compliance assets DELETE API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
