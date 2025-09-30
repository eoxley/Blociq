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
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { structuredId, action, editedData, reviewNotes } = await request.json();

    if (!structuredId || !action) {
      return NextResponse.json({ error: 'Structured ID and action required' }, { status: 400 });
    }

    if (!['accept', 'reject', 'edit'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be accept, reject, or edit' }, { status: 400 });
    }

    // Get the structured record
    const { data: structuredRecord, error: recordError } = await supabase
      .from('staging_structured')
      .select('*')
      .eq('id', structuredId)
      .single();

    if (recordError || !structuredRecord) {
      return NextResponse.json({ error: 'Structured record not found' }, { status: 404 });
    }

    let updateData: any = {
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null
    };

    if (action === 'accept') {
      updateData.status = 'accepted';
      
    } else if (action === 'reject') {
      updateData.status = 'rejected';
      
    } else if (action === 'edit') {
      if (!editedData) {
        return NextResponse.json({ error: 'Edited data required for edit action' }, { status: 400 });
      }
      
      updateData.status = 'edited';
      updateData.data = editedData;
    }

    // Update the structured record
    const { data: updatedRecord, error: updateError } = await supabase
      .from('staging_structured')
      .update(updateData)
      .eq('id', structuredId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedRecord
    });

  } catch (error) {
    console.error('Review API error:', error);
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
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const status = searchParams.get('status');
    const suggestedTable = searchParams.get('suggestedTable');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for pending reviews
    let query = supabase
      .from('staging_structured')
      .select(`
        *,
        raw_file:onboarding_raw!staging_structured_raw_id_fkey(
          file_name,
          file_type,
          detected_type,
          building_name,
          processing_status,
          batch:onboarding_batches!onboarding_raw_batch_id_fkey(batch_name)
        ),
        reviewer:profiles!staging_structured_reviewer_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchId) {
      query = query.eq('raw_file.batch_id', batchId);
    }

    if (status) {
      query = query.eq('status', status);
    } else {
      // Default to pending reviews
      query = query.eq('status', 'pending');
    }

    if (suggestedTable) {
      query = query.eq('suggested_table', suggestedTable);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('GET reviews error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
