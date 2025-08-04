// ✅ AUDIT COMPLETE [2025-01-15]
// - Has try/catch wrapper
// - Validates required fields (ai_log_id, rating)
// - Uses proper Supabase queries with authentication
// - Returns meaningful error responses
// - Includes authentication check

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ai_log_id, rating, comment = '' } = body;

    // Validate required fields
    if (!ai_log_id) {
      return NextResponse.json({ error: 'AI log ID is required' }, { status: 400 });
    }

    if (rating === undefined || rating === null) {
      return NextResponse.json({ error: 'Rating is required' }, { status: 400 });
    }

    // Validate rating value
    if (![-1, 0, 1].includes(rating)) {
      return NextResponse.json({ error: 'Rating must be -1, 0, or 1' }, { status: 400 });
    }

    // Check if feedback already exists for this AI log and user
    const { data: existingFeedback } = await supabase
      .from('ai_feedback')
      .select('id')
      .eq('ai_log_id', ai_log_id)
      .eq('user_id', user.id)
      .single();

    if (existingFeedback) {
      return NextResponse.json({ error: 'Feedback already submitted for this response' }, { status: 409 });
    }

    // Verify the AI log exists
    const { data: aiLog } = await supabase
      .from('ai_logs')
      .select('id')
      .eq('id', ai_log_id)
      .single();

    if (!aiLog) {
      return NextResponse.json({ error: 'AI log not found' }, { status: 404 });
    }

    // Insert feedback
    const { error: insertError } = await supabase
      .from('ai_feedback')
      .insert({
        ai_log_id,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      });

    if (insertError) {
      console.error('Error inserting AI feedback:', insertError);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    console.log('✅ AI feedback logged successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('❌ Error in ai-feedback route:', error);
    return NextResponse.json({ 
      error: 'Failed to process feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 