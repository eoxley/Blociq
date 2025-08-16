import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query
    let query = supabaseAdmin
      .from('ai_building_queries')
      .select(`
        id,
        building_id,
        unit_id,
        leaseholder_id,
        query_text,
        response_text,
        context_type,
        user_id,
        session_id,
        metadata,
        created_at,
        buildings (
          id,
          name,
          address
        ),
        units (
          id,
          unit_number,
          unit_label
        ),
        leaseholders (
          id,
          name,
          email
        )
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by building if specified
    if (buildingId) {
      query = query.eq('building_id', buildingId);
    }

    const { data: queries, error } = await query;

    if (error) throw error;

    // Get summary statistics
    const { data: summary } = await supabaseAdmin
      .from('vw_building_query_analytics')
      .select('*')
      .gte('last_query', startDate.toISOString());

    // Get context type breakdown
    const { data: contextBreakdown } = await supabaseAdmin
      .from('ai_building_queries')
      .select('context_type')
      .gte('created_at', startDate.toISOString());

    const contextStats = contextBreakdown?.reduce((acc, query) => {
      const type = query.context_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({
      queries: queries || [],
      summary: summary || [],
      contextBreakdown: contextStats,
      dateRange: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days
      }
    });

  } catch (error: any) {
    console.error('Error fetching building query analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
