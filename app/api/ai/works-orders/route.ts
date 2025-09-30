import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');
    const status = searchParams.get('status') || 'open';
    
    if (!buildingId) {
      return NextResponse.json({ error: 'building_id is required' }, { status: 400 });
    }
    
    const supabase = createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to building
    const { data: userBuilding } = await supabase
      .from('user_buildings')
      .select('role')
      .eq('building_id', buildingId)
      .eq('user_id', user.id)
      .single();

    if (!userBuilding) {
      return NextResponse.json({ error: 'Building access denied' }, { status: 403 });
    }

    // Build query based on status filter
    let statusFilter = ['draft', 'issued', 'in_progress'];
    if (status === 'completed') {
      statusFilter = ['completed'];
    } else if (status === 'all') {
      statusFilter = ['draft', 'issued', 'in_progress', 'completed', 'cancelled'];
    }

    // Get works orders with totals
    const { data: worksOrders, error: woError } = await supabase
      .from('works_orders')
      .select(`
        id,
        ref,
        title,
        description,
        priority,
        status,
        target_date,
        created_at,
        approved_at,
        contractors (name),
        works_order_lines (
          description,
          quantity,
          unit_cost,
          total
        )
      `)
      .eq('building_id', buildingId)
      .in('status', statusFilter)
      .order('target_date', { ascending: true, nullsLast: true });

    if (woError) {
      return NextResponse.json({ error: 'Failed to fetch works orders' }, { status: 500 });
    }

    // Process works orders with calculated totals
    const processedWOs = worksOrders?.map(wo => {
      const totalEstimated = wo.works_order_lines.reduce((sum, line) => sum + (line.total || 0), 0);
      const lineCount = wo.works_order_lines.length;
      
      // Calculate days until target date
      const daysUntilTarget = wo.target_date 
        ? Math.ceil((new Date(wo.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: wo.id,
        ref: wo.ref,
        title: wo.title,
        description: wo.description,
        priority: wo.priority,
        status: wo.status,
        target_date: wo.target_date,
        days_until_target: daysUntilTarget,
        contractor_name: wo.contractors.name,
        total_estimated: totalEstimated,
        line_count: lineCount,
        created_at: wo.created_at,
        approved_at: wo.approved_at,
        lines: wo.works_order_lines,
      };
    }) || [];

    // Generate summary statistics
    const summary = {
      total: processedWOs.length,
      by_status: {
        draft: processedWOs.filter(wo => wo.status === 'draft').length,
        issued: processedWOs.filter(wo => wo.status === 'issued').length,
        in_progress: processedWOs.filter(wo => wo.status === 'in_progress').length,
        completed: processedWOs.filter(wo => wo.status === 'completed').length,
        cancelled: processedWOs.filter(wo => wo.status === 'cancelled').length,
      },
      by_priority: {
        low: processedWOs.filter(wo => wo.priority === 'low').length,
        normal: processedWOs.filter(wo => wo.priority === 'normal').length,
        high: processedWOs.filter(wo => wo.priority === 'high').length,
        urgent: processedWOs.filter(wo => wo.priority === 'urgent').length,
      },
      total_value: processedWOs.reduce((sum, wo) => sum + wo.total_estimated, 0),
      overdue: processedWOs.filter(wo => wo.days_until_target !== null && wo.days_until_target < 0).length,
      due_soon: processedWOs.filter(wo => wo.days_until_target !== null && wo.days_until_target >= 0 && wo.days_until_target <= 7).length,
    };

    // Generate AI insights
    const insights = generateWorksOrderInsights(processedWOs, summary);

    return NextResponse.json({
      success: true,
      data: {
        works_orders: processedWOs,
        summary,
        insights,
      },
    });

  } catch (error) {
    console.error('Error fetching works orders:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate AI insights
function generateWorksOrderInsights(worksOrders: any[], summary: any): string[] {
  const insights = [];

  // Overdue works orders
  if (summary.overdue > 0) {
    insights.push(`${summary.overdue} works order${summary.overdue > 1 ? 's are' : ' is'} overdue. Review and update target dates or prioritize completion.`);
  }

  // Due soon
  if (summary.due_soon > 0) {
    insights.push(`${summary.due_soon} works order${summary.due_soon > 1 ? 's are' : ' is'} due within 7 days. Ensure contractors are on track.`);
  }

  // High priority items
  const urgentWOs = worksOrders.filter(wo => wo.priority === 'urgent' && wo.status !== 'completed');
  if (urgentWOs.length > 0) {
    insights.push(`${urgentWOs.length} urgent works order${urgentWOs.length > 1 ? 's' : ''} require immediate attention.`);
  }

  // High value works orders
  const highValueWOs = worksOrders.filter(wo => wo.total_estimated > 5000);
  if (highValueWOs.length > 0) {
    insights.push(`${highValueWOs.length} high-value works order${highValueWOs.length > 1 ? 's' : ''} (over £5k) should be closely monitored.`);
  }

  // Stuck in draft
  const draftWOs = worksOrders.filter(wo => wo.status === 'draft');
  if (draftWOs.length > 0) {
    const oldDrafts = draftWOs.filter(wo => {
      const daysSinceCreated = Math.ceil((new Date().getTime() - new Date(wo.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCreated > 7;
    });
    
    if (oldDrafts.length > 0) {
      insights.push(`${oldDrafts.length} works order${oldDrafts.length > 1 ? 's have' : ' has'} been in draft status for over a week. Consider reviewing and approving.`);
    }
  }

  // Completed works orders
  if (summary.by_status.completed > 0) {
    insights.push(`${summary.by_status.completed} works order${summary.by_status.completed > 1 ? 's have' : ' has'} been completed. Great progress!`);
  }

  // Value insights
  if (summary.total_value > 0) {
    const avgValue = summary.total_value / summary.total;
    if (avgValue > 10000) {
      insights.push(`Average works order value is £${avgValue.toLocaleString()}. Consider breaking down large projects into smaller phases.`);
    }
  }

  // Contractor distribution
  const contractorCounts = worksOrders.reduce((acc, wo) => {
    acc[wo.contractor_name] = (acc[wo.contractor_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topContractor = Object.entries(contractorCounts).sort(([,a], [,b]) => b - a)[0];
  if (topContractor && topContractor[1] > 1) {
    insights.push(`${topContractor[0]} has ${topContractor[1]} active works orders. Consider workload distribution.`);
  }

  return insights;
}


