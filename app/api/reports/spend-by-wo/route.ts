import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    
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

    // Get spend by works order from GL lines
    const { data: spendData, error: spendError } = await supabase
      .from('gl_lines')
      .select(`
        works_order_id,
        works_orders!inner (
          ref,
          title,
          status,
          target_date,
          contractors (name)
        ),
        SUM(debit) as actual_spend
      `)
      .eq('gl_journals.building_id', buildingId)
      .gte('gl_journals.date', `${year}-01-01`)
      .lte('gl_journals.date', `${year}-12-31`)
      .not('works_order_id', 'is', null)
      .gt('debit', 0)
      .group('works_order_id, works_orders.ref, works_orders.title, works_orders.status, works_orders.target_date, works_orders.contractors.name')
      .order('actual_spend', { ascending: false });

    if (spendError) {
      return NextResponse.json({ error: 'Failed to fetch spend data' }, { status: 500 });
    }

    // Get estimated totals for works orders
    const worksOrderIds = spendData?.map(item => item.works_order_id) || [];
    const { data: estimatedData, error: estError } = await supabase
      .from('works_order_lines')
      .select(`
        wo_id,
        SUM(total) as estimated_total
      `)
      .in('wo_id', worksOrderIds)
      .group('wo_id');

    if (estError) {
      console.error('Failed to fetch estimated data:', estError);
    }

    // Combine spend and estimated data
    const reportData = spendData?.map(item => {
      const estimated = estimatedData?.find(est => est.wo_id === item.works_order_id);
      const estimatedTotal = parseFloat(estimated?.estimated_total) || 0;
      const actualSpend = parseFloat(item.actual_spend) || 0;
      
      return {
        works_order_id: item.works_order_id,
        ref: item.works_orders.ref,
        title: item.works_orders.title,
        status: item.works_orders.status,
        target_date: item.works_orders.target_date,
        contractor_name: item.works_orders.contractors.name,
        estimated_total: estimatedTotal,
        actual_spend: actualSpend,
        variance: actualSpend - estimatedTotal,
        variance_percent: estimatedTotal > 0 ? ((actualSpend - estimatedTotal) / estimatedTotal) * 100 : 0,
      };
    }) || [];

    // Calculate summary statistics
    const totalEstimated = reportData.reduce((sum, item) => sum + item.estimated_total, 0);
    const totalActual = reportData.reduce((sum, item) => sum + item.actual_spend, 0);
    const totalVariance = totalActual - totalEstimated;

    const summary = {
      year: parseInt(year),
      total_works_orders: reportData.length,
      total_estimated,
      total_actual_spend: totalActual,
      total_variance,
      average_variance_percent: reportData.length > 0 
        ? reportData.reduce((sum, item) => sum + item.variance_percent, 0) / reportData.length 
        : 0,
      completed_orders: reportData.filter(item => item.status === 'completed').length,
      over_budget_orders: reportData.filter(item => item.variance > 0).length,
      under_budget_orders: reportData.filter(item => item.variance < 0).length,
    };

    // Generate insights
    const insights = generateWorksOrderInsights(reportData, summary);

    return NextResponse.json({
      success: true,
      data: {
        works_orders: reportData,
        summary,
        insights,
      },
    });

  } catch (error) {
    console.error('Error generating spend by works order report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate insights
function generateWorksOrderInsights(data: any[], summary: any): string[] {
  const insights = [];

  // Budget performance
  if (summary.over_budget_orders > 0) {
    const overBudgetPercent = (summary.over_budget_orders / summary.total_works_orders) * 100;
    insights.push(`${summary.over_budget_orders} works order${summary.over_budget_orders > 1 ? 's' : ''} (${overBudgetPercent.toFixed(1)}%) exceeded their estimated budget.`);
  }

  if (summary.under_budget_orders > 0) {
    const underBudgetPercent = (summary.under_budget_orders / summary.total_works_orders) * 100;
    insights.push(`${summary.under_budget_orders} works order${summary.under_budget_orders > 1 ? 's' : ''} (${underBudgetPercent.toFixed(1)}%) came in under budget.`);
  }

  // High variance works orders
  const highVariance = data.filter(wo => Math.abs(wo.variance_percent) > 20);
  if (highVariance.length > 0) {
    insights.push(`${highVariance.length} works order${highVariance.length > 1 ? 's have' : ' has'} significant variance (>20%) between estimated and actual costs.`);
  }

  // Top spenders
  const top3 = data.slice(0, 3);
  if (top3.length > 0) {
    insights.push(`Highest spending works orders: ${top3.map(wo => `${wo.ref} (£${wo.actual_spend.toLocaleString()})`).join(', ')}`);
  }

  // Status analysis
  const statusCounts = data.reduce((acc, wo) => {
    acc[wo.status] = (acc[wo.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const incompleteOrders = (statusCounts.draft || 0) + (statusCounts.issued || 0) + (statusCounts.in_progress || 0);
  if (incompleteOrders > 0) {
    insights.push(`${incompleteOrders} works order${incompleteOrders > 1 ? 's are' : ' is'} still in progress or not started.`);
  }

  // Contractor performance
  const contractorVariance = data.reduce<Record<string, { total_variance: number; count: number }>>((acc, wo) => {
    if (!acc[wo.contractor_name]) {
      acc[wo.contractor_name] = { total_variance: 0, count: 0 };
    }
    acc[wo.contractor_name].total_variance += wo.variance;
    acc[wo.contractor_name].count += 1;
    return acc;
  }, {});

  const contractorPerformance = Object.entries(contractorVariance)
    .map(([name, data]) => ({
      name,
      avg_variance: data.total_variance / data.count,
      count: data.count
    }))
    .sort((a, b) => a.avg_variance - b.avg_variance);

  if (contractorPerformance.length > 0) {
    const bestPerformer = contractorPerformance[0];
    const worstPerformer = contractorPerformance[contractorPerformance.length - 1];
    
    if (bestPerformer.avg_variance < 0) {
      insights.push(`${bestPerformer.name} consistently delivers under budget (avg: £${Math.abs(bestPerformer.avg_variance).toLocaleString()} under).`);
    }
    
    if (worstPerformer.avg_variance > 0) {
      insights.push(`${worstPerformer.name} tends to exceed budgets (avg: £${worstPerformer.avg_variance.toLocaleString()} over).`);
    }
  }

  // Overall performance
  if (summary.average_variance_percent > 10) {
    insights.push(`Average variance is ${summary.average_variance_percent.toFixed(1)}% over budget. Consider improving estimation processes.`);
  } else if (summary.average_variance_percent < -5) {
    insights.push(`Average variance is ${Math.abs(summary.average_variance_percent).toFixed(1)}% under budget. Good cost control!`);
  }

  return insights;
}




