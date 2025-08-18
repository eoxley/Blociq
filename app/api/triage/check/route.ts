import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Check for existing triage results
    const { data: triageAction, error } = await supabaseAdmin
      .from('ai_triage_actions')
      .select('*')
      .eq('message_id', messageId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking triage results:', error);
      return NextResponse.json({ error: 'Failed to check triage results' }, { status: 500 });
    }

    if (!triageAction) {
      return NextResponse.json({ triage: null });
    }

    // Return the triage result
    return NextResponse.json({
      triage: {
        category: triageAction.category,
        priority: triageAction.priority,
        reason: triageAction.reason,
        due_date: triageAction.due_date,
        applied: triageAction.applied,
        applied_at: triageAction.applied_at
      }
    });

  } catch (error: any) {
    console.error("Triage check error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to check triage results" 
    }, { status: 500 });
  }
}
