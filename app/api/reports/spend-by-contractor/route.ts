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

    // Get spend by contractor from GL lines
    const { data: spendData, error: spendError } = await supabase
      .from('gl_lines')
      .select(`
        contractor_id,
        contractors!inner (name, categories),
        SUM(debit) as total_spend
      `)
      .eq('gl_journals.building_id', buildingId)
      .gte('gl_journals.date', `${year}-01-01`)
      .lte('gl_journals.date', `${year}-12-31`)
      .not('contractor_id', 'is', null)
      .gt('debit', 0)
      .group('contractor_id, contractors.name, contractors.categories')
      .order('total_spend', { ascending: false });

    if (spendError) {
      return NextResponse.json({ error: 'Failed to fetch spend data' }, { status: 500 });
    }

    // Get works order data for each contractor
    const contractorIds = spendData?.map(item => item.contractor_id) || [];
    const { data: worksOrderData, error: woError } = await supabase
      .from('works_orders')
      .select(`
        contractor_id,
        contractors!inner (name),
        COUNT(*) as wo_count,
        SUM(works_order_lines.total) as estimated_total
      `)
      .eq('building_id', buildingId)
      .gte('created_at', `${year}-01-01`)
      .lte('created_at', `${year}-12-31`)
      .in('contractor_id', contractorIds)
      .group('contractor_id, contractors.name');

    if (woError) {
      console.error('Failed to fetch works order data:', woError);
    }

    // Combine spend and works order data
    const reportData = spendData?.map(item => {
      const woData = worksOrderData?.find(wo => wo.contractor_id === item.contractor_id);
      
      return {
        contractor_id: item.contractor_id,
        contractor_name: item.contractors.name,
        categories: item.contractors.categories || [],
        total_spend: parseFloat(item.total_spend) || 0,
        works_order_count: parseInt(woData?.wo_count) || 0,
        estimated_total: parseFloat(woData?.estimated_total) || 0,
        variance: (parseFloat(item.total_spend) || 0) - (parseFloat(woData?.estimated_total) || 0),
      };
    }) || [];

    // Calculate summary statistics
    const totalSpend = reportData.reduce((sum, item) => sum + item.total_spend, 0);
    const totalEstimated = reportData.reduce((sum, item) => sum + item.estimated_total, 0);
    const totalVariance = totalSpend - totalEstimated;

    const summary = {
      year: parseInt(year),
      total_contractors: reportData.length,
      total_spend,
      total_estimated,
      total_variance,
      average_spend_per_contractor: reportData.length > 0 ? totalSpend / reportData.length : 0,
      top_contractor: reportData[0]?.contractor_name || null,
      top_contractor_spend: reportData[0]?.total_spend || 0,
    };

    // Generate insights
    const insights = generateSpendInsights(reportData, summary);

    return NextResponse.json({
      success: true,
      data: {
        contractors: reportData,
        summary,
        insights,
      },
    });

  } catch (error) {
    console.error('Error generating spend by contractor report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate insights
function generateSpendInsights(data: any[], summary: any): string[] {
  const insights = [];

  // Top spenders
  if (data.length > 0) {
    const top3 = data.slice(0, 3);
    insights.push(`Top 3 contractors by spend: ${top3.map(c => `${c.contractor_name} (£${c.total_spend.toLocaleString()})`).join(', ')}`);
  }

  // Variance analysis
  if (summary.total_variance > 0) {
    const variancePercent = (summary.total_variance / summary.total_estimated) * 100;
    insights.push(`Actual spend exceeded estimates by £${summary.total_variance.toLocaleString()} (${variancePercent.toFixed(1)}%). Consider improving estimation processes.`);
  } else if (summary.total_variance < 0) {
    const variancePercent = (Math.abs(summary.total_variance) / summary.total_estimated) * 100;
    insights.push(`Actual spend was £${Math.abs(summary.total_variance).toLocaleString()} under estimates (${variancePercent.toFixed(1)}%). Good cost control!`);
  }

  // High variance contractors
  const highVariance = data.filter(c => Math.abs(c.variance) > 1000);
  if (highVariance.length > 0) {
    insights.push(`${highVariance.length} contractor${highVariance.length > 1 ? 's have' : ' has'} significant variance between estimated and actual spend. Review estimation accuracy.`);
  }

  // Category analysis
  const categorySpend = data.reduce((acc, contractor) => {
    contractor.categories.forEach((category: string) => {
      acc[category] = (acc[category] || 0) + contractor.total_spend;
    });
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categorySpend).sort(([,a], [,b]) => b - a)[0];
  if (topCategory) {
    insights.push(`Highest spending category: ${topCategory[0]} (£${topCategory[1].toLocaleString()})`);
  }

  // Works order efficiency
  const contractorsWithWOs = data.filter(c => c.works_order_count > 0);
  if (contractorsWithWOs.length > 0) {
    const avgSpendPerWO = contractorsWithWOs.reduce((sum, c) => sum + (c.total_spend / c.works_order_count), 0) / contractorsWithWOs.length;
    insights.push(`Average spend per works order: £${avgSpendPerWO.toLocaleString()}`);
  }

  return insights;
}




