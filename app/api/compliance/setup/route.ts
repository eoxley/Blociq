import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { MASTER_COMPLIANCE_ASSETS } from '@/lib/compliance/masterAssets';

export async function POST(request: NextRequest) {
  try {
    console.log('🏗️ Setting up compliance assets for building...');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Parse the request body
    const body = await request.json();
    const { building_id, asset_ids } = body;

    if (!building_id || !asset_ids || !Array.isArray(asset_ids)) {
      return NextResponse.json({ 
        error: 'Missing required fields: building_id and asset_ids array are required' 
      }, { status: 400 });
    }

    console.log('📋 Setting up compliance assets:', {
      building_id,
      asset_count: asset_ids.length
    });

    // Verify building exists and user has access
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', building_id)
      .single();

    if (buildingError || !building) {
      console.error('❌ Building not found:', buildingError);
      return NextResponse.json({ 
        error: 'Building not found' 
      }, { status: 404 });
    }

    // Check user access to building
    const { data: userBuildings, error: accessError } = await supabase
      .from('building_users')
      .select('building_id')
      .eq('user_id', user.id)
      .eq('building_id', building_id);

    if (accessError || !userBuildings || userBuildings.length === 0) {
      console.error('❌ User does not have access to building:', accessError);
      return NextResponse.json({ 
        error: 'Access denied to this building' 
      }, { status: 403 });
    }

    // Remove existing compliance assets for this building
    const { error: deleteError } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('building_id', building_id);

    if (deleteError) {
      console.error('❌ Failed to remove existing compliance assets:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to remove existing compliance assets',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log('✅ Removed existing compliance assets');

    // Validate asset IDs against master list
    const validAssetIds = asset_ids.filter(id => 
      MASTER_COMPLIANCE_ASSETS.some(asset => asset.id === id)
    );

    if (validAssetIds.length !== asset_ids.length) {
      console.warn('⚠️ Some asset IDs were invalid and will be skipped');
    }

    if (validAssetIds.length === 0) {
      return NextResponse.json({ 
        error: 'No valid compliance assets provided' 
      }, { status: 400 });
    }

    // Prepare compliance assets data
    const complianceAssets = validAssetIds.map(assetId => {
      const masterAsset = MASTER_COMPLIANCE_ASSETS.find(asset => asset.id === assetId);
      if (!masterAsset) return null;

      // Calculate initial due date (3 months from now for most assets)
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 3);

      return {
        building_id: building_id,
        asset_id: assetId,
        status: 'pending',
        priority: masterAsset.priority,
        due_date: dueDate.toISOString().split('T')[0],
        last_completed: null,
        next_due: null,
        assigned_to: null,
        notes: masterAsset.default_notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }).filter(Boolean);

    // Insert new compliance assets
    const { data: insertedAssets, error: insertError } = await supabase
      .from('building_compliance_assets')
      .insert(complianceAssets)
      .select();

    if (insertError) {
      console.error('❌ Failed to insert compliance assets:', insertError);
      return NextResponse.json({ 
        error: 'Failed to create compliance assets',
        details: insertError.message 
      }, { status: 500 });
    }

    console.log('✅ Successfully created compliance assets:', insertedAssets?.length || 0);

    // Log the setup action
    const { error: logError } = await supabase
      .from('compliance_history')
      .insert({
        building_id: building_id,
        asset_id: null, // This is a setup action, not asset-specific
        action: 'created',
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        notes: `Compliance setup completed with ${validAssetIds.length} assets`
      });

    if (logError) {
      console.warn('⚠️ Failed to log compliance history:', logError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully configured ${validAssetIds.length} compliance assets for ${building.name}`,
      building_id: building_id,
      asset_count: validAssetIds.length,
      assets: insertedAssets
    });

  } catch (error) {
    console.error('❌ Compliance setup error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
