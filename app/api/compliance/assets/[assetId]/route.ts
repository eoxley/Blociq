import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PUT(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    console.log('📝 Updating compliance asset:', params.assetId);
    
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
    const { building_id, status, priority, due_date, assigned_to, notes } = body;

    if (!building_id) {
      return NextResponse.json({ 
        error: 'Missing required field: building_id' 
      }, { status: 400 });
    }

    console.log('📋 Updating asset with data:', {
      asset_id: params.assetId,
      building_id,
      status,
      priority,
      due_date,
      assigned_to,
      notes
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

    // Get the current asset to log changes
    const { data: currentAsset, error: currentAssetError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('id', params.assetId)
      .eq('building_id', building_id)
      .single();

    if (currentAssetError || !currentAsset) {
      console.error('❌ Asset not found:', currentAssetError);
      return NextResponse.json({ 
        error: 'Compliance asset not found' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (notes !== undefined) updateData.notes = notes;

    // Update the compliance asset
    const { data: updatedAsset, error: updateError } = await supabase
      .from('building_compliance_assets')
      .update(updateData)
      .eq('id', params.assetId)
      .eq('building_id', building_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update compliance asset:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update compliance asset',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Successfully updated compliance asset');

    // Log the changes
    const changes = [];
    if (status !== undefined && status !== currentAsset.status) {
      changes.push(`Status: ${currentAsset.status} → ${status}`);
    }
    if (priority !== undefined && priority !== currentAsset.priority) {
      changes.push(`Priority: ${currentAsset.priority} → ${priority}`);
    }
    if (due_date !== undefined && due_date !== currentAsset.due_date) {
      changes.push(`Due date: ${currentAsset.due_date} → ${due_date}`);
    }
    if (assigned_to !== undefined && assigned_to !== currentAsset.assigned_to) {
      changes.push(`Assigned to: ${currentAsset.assigned_to || 'None'} → ${assigned_to || 'None'}`);
    }
    if (notes !== undefined && notes !== currentAsset.notes) {
      changes.push(`Notes updated`);
    }

    if (changes.length > 0) {
      const { error: logError } = await supabase
        .from('compliance_history')
        .insert({
          building_id: building_id,
          asset_id: params.assetId,
          action: 'updated',
          changed_by: user.id,
          changed_at: new Date().toISOString(),
          old_value: JSON.stringify(currentAsset),
          new_value: JSON.stringify(updatedAsset),
          notes: `Updated: ${changes.join(', ')}`
        });

      if (logError) {
        console.warn('⚠️ Failed to log compliance history:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance asset updated successfully',
      asset: updatedAsset
    });

  } catch (error) {
    console.error('❌ Update compliance asset error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    console.log('🗑️ Deleting compliance asset:', params.assetId);
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const building_id = searchParams.get('building_id');

    if (!building_id) {
      return NextResponse.json({ 
        error: 'Missing required parameter: building_id' 
      }, { status: 400 });
    }

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

    // Get the current asset to log deletion
    const { data: currentAsset, error: currentAssetError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('id', params.assetId)
      .eq('building_id', building_id)
      .single();

    if (currentAssetError || !currentAsset) {
      console.error('❌ Asset not found:', currentAssetError);
      return NextResponse.json({ 
        error: 'Compliance asset not found' 
      }, { status: 404 });
    }

    // Delete the compliance asset
    const { error: deleteError } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('id', params.assetId)
      .eq('building_id', building_id);

    if (deleteError) {
      console.error('❌ Failed to delete compliance asset:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete compliance asset',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log('✅ Successfully deleted compliance asset');

    // Log the deletion
    const { error: logError } = await supabase
      .from('compliance_history')
      .insert({
        building_id: building_id,
        asset_id: params.assetId,
        action: 'deleted',
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        old_value: JSON.stringify(currentAsset),
        notes: 'Compliance asset deleted'
      });

    if (logError) {
      console.warn('⚠️ Failed to log compliance history:', logError);
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance asset deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete compliance asset error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
