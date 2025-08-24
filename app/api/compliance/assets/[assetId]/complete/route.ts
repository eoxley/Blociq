import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getAssetFrequency } from '@/lib/compliance/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    console.log('✅ Marking compliance asset as completed:', params.assetId);
    
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
    const { building_id, completed_date } = body;

    if (!building_id || !completed_date) {
      return NextResponse.json({ 
        error: 'Missing required fields: building_id and completed_date are required' 
      }, { status: 400 });
    }

    console.log('📋 Marking asset as completed:', {
      asset_id: params.assetId,
      building_id,
      completed_date
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

    // Get the current asset
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

    // Calculate next due date based on frequency
    const frequencyMonths = getAssetFrequency(currentAsset.asset_id);
    const completedDate = new Date(completed_date);
    const nextDueDate = new Date(completedDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + frequencyMonths);

    // Update the compliance asset
    const updateData = {
      status: 'compliant',
      last_completed: completed_date,
      next_due: nextDueDate.toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };

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
        error: 'Failed to mark asset as completed',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Successfully marked asset as completed');

    // Log the completion
    const { error: logError } = await supabase
      .from('compliance_history')
      .insert({
        building_id: building_id,
        asset_id: params.assetId,
        action: 'completed',
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        old_value: JSON.stringify(currentAsset),
        new_value: JSON.stringify(updatedAsset),
        notes: `Marked as completed on ${completed_date}. Next due: ${nextDueDate.toISOString().split('T')[0]}`
      });

    if (logError) {
      console.warn('⚠️ Failed to log compliance history:', logError);
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance asset marked as completed successfully',
      asset: updatedAsset,
      next_due_date: nextDueDate.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('❌ Mark asset as completed error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
