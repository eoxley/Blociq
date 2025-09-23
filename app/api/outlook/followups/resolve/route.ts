// app/api/outlook/followups/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export interface ResolveFollowupRequest {
  followupId: string;
  resolution?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResolveFollowupRequest = await request.json();
    const { followupId, resolution } = body;

    if (!followupId) {
      return NextResponse.json({
        success: false,
        error: 'Follow-up ID is required'
      }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Update follow-up status
    const { error: followupError } = await supabase
      .from('communications_followups')
      .update({
        status: 'completed',
        resolution: resolution || null,
        completed_at: new Date().toISOString(),
        completed_by: user.id
      })
      .eq('id', followupId);

    if (followupError) {
      console.error('Error resolving followup:', followupError);
      return NextResponse.json({
        success: false,
        error: 'Failed to resolve follow-up'
      }, { status: 500 });
    }

    // Update related building todo
    const { error: todoError } = await supabase
      .from('building_todos')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id
      })
      .eq('source', 'followup')
      .eq('source_id', followupId);

    if (todoError) {
      console.warn('Error updating related todo:', todoError);
      // Don't fail the whole request
    }

    return NextResponse.json({
      success: true,
      message: 'Follow-up resolved successfully'
    });

  } catch (error) {
    console.error('Error resolving follow-up:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to resolve follow-up'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}