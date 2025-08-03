// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for messageId
// - Supabase query with proper .eq() filter
// - Try/catch with detailed error handling
// - Used in inbox components

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log("📁 Marking email as archived...");
    
    const body = await req.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    console.log("✅ Valid request received:", { messageId });

    // Update email status to archived
    const { error: updateError } = await supabase
      .from('incoming_emails')
      .update({ 
        status: 'archived',
        handled_at: new Date().toISOString(),
        is_handled: true,
        folder: 'BlocIQ/Archived'
      })
      .eq('message_id', messageId);

    if (updateError) {
      console.error("❌ Failed to mark email as archived:", updateError);
      return NextResponse.json({ 
        error: 'Failed to mark email as archived' 
      }, { status: 500 });
    }

    console.log("✅ Email marked as archived successfully");

    return NextResponse.json({
      success: true,
      message: 'Email marked as archived'
    });

  } catch (error) {
    console.error('❌ Mark archived error:', error);
    return NextResponse.json({ 
      error: 'Failed to mark email as archived',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 