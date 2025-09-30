import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, agency_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { batchName, buildingName } = await request.json();

    if (!batchName) {
      return NextResponse.json({ error: 'Batch name required' }, { status: 400 });
    }

    // Create new batch
    const { data: batchData, error: batchError } = await supabase
      .from('onboarding_batches')
      .insert({
        batch_name: batchName,
        agency_id: profile.agency_id,
        building_name: buildingName || null,
        created_by: user.id,
        status: 'active'
      })
      .select()
      .single();

    if (batchError) {
      console.error('Batch creation error:', batchError);
      return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: batchData
    });

  } catch (error) {
    console.error('Create batch API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, agency_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeStats = searchParams.get('includeStats') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('onboarding_batches')
      .select(`
        *,
        created_by_user:profiles!onboarding_batches_created_by_fkey(full_name),
        agency:agencies!onboarding_batches_agency_id_fkey(name)
      `)
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: batches, error: batchesError } = await query;

    if (batchesError) {
      console.error('Database error:', batchesError);
      return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
    }

    // Add statistics if requested
    let batchesWithStats = batches || [];
    
    if (includeStats && batchesWithStats.length > 0) {
      for (let batch of batchesWithStats) {
        const { data: stats } = await supabase.rpc('get_onboarding_stats', {
          batch_id_param: batch.id
        });
        
        if (stats && stats.length > 0) {
          batch.stats = stats[0];
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: batchesWithStats
    });

  } catch (error) {
    console.error('GET batches error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { batchId, batchName, buildingName, status } = await request.json();

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });
    }

    // Build update object
    const updateData: any = {};
    if (batchName) updateData.batch_name = batchName;
    if (buildingName !== undefined) updateData.building_name = buildingName;
    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    // Update batch
    const { data: updatedBatch, error: updateError } = await supabase
      .from('onboarding_batches')
      .update(updateData)
      .eq('id', batchId)
      .select()
      .single();

    if (updateError) {
      console.error('Batch update error:', updateError);
      return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedBatch
    });

  } catch (error) {
    console.error('Update batch API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });
    }

    // Check if batch has any files
    const { data: files, error: filesError } = await supabase
      .from('onboarding_raw')
      .select('id')
      .eq('batch_id', batchId)
      .limit(1);

    if (filesError) {
      console.error('Files check error:', filesError);
      return NextResponse.json({ error: 'Failed to check batch files' }, { status: 500 });
    }

    if (files && files.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete batch with files. Delete files first or archive the batch.' 
      }, { status: 400 });
    }

    // Delete batch
    const { error: deleteError } = await supabase
      .from('onboarding_batches')
      .delete()
      .eq('id', batchId);

    if (deleteError) {
      console.error('Batch deletion error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Batch deleted successfully'
    });

  } catch (error) {
    console.error('Delete batch API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
