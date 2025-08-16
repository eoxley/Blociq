import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { 
      buildingId, 
      unitId, 
      leaseholderId, 
      query, 
      response, 
      contextType, 
      userId, 
      sessionId,
      metadata 
    } = await req.json();

    // Log the building query
    const { error } = await supabaseAdmin
      .from('ai_building_queries')
      .insert({
        building_id: buildingId,
        unit_id: unitId,
        leaseholder_id: leaseholderId,
        query_text: query,
        response_text: response,
        context_type: contextType,
        user_id: userId,
        session_id: sessionId,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging building query:', error);
      return NextResponse.json({ error: 'Failed to log query' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in log-building-query:', error);
    return NextResponse.json(
      { error: 'Failed to log building query' },
      { status: 500 }
    );
  }
}
