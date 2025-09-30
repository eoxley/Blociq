import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { buildingId, budgetVersionId, period } = body;

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    if (!buildingId || !budgetVersionId) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'buildingId and budgetVersionId are required'
      }, { status: 400 });
    }

    // Get budget data
    const { data: budget } = await supabase
      .from('budget_lines')
      .select(`
        *,
        gl_accounts!inner (
          id,
          account_code,
          account_name,
          account_type
        ),
        budget_versions!inner (
          id,
          version_name,
          budget_year,
          building_id
        )
      `)
      .eq('budget_version_id', budgetVersionId)
      .order('gl_accounts.account_code');

    // Get actual spending for the period
    const periodStart = period?.start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const periodEnd = period?.end || new Date().toISOString().split('T')[0];

    const { data: actualSpending } = await supabase
      .from('gl_lines')
      .select(`
        account_id,
        debit_amount,
        gl_journals!inner (
          journal_date,
          building_id
        ),
        gl_accounts!inner (
          id,
          account_code,
          account_name
        )
      `)
      .eq('gl_journals.building_id', buildingId)
      .gte('gl_journals.journal_date', periodStart)
      .lte('gl_journals.journal_date', periodEnd)
      .eq('gl_accounts.account_type', 'EXPENSE');

    // Calculate variances
    const variances = [];
    const totalBudgetVariance = { budget: 0, actual: 0, variance: 0, percentage: 0 };

    for (const budgetLine of budget || []) {
      const accountId = budgetLine.account_id;
      const budgetAmount = budgetLine.budget_amount;
      
      // Calculate actual spending for this account
      const actualAmount = (actualSpending || [])
        .filter((line: any) => line.account_id === accountId)
        .reduce((sum: number, line: any) => sum + (line.debit_amount || 0), 0);

      const variance = actualAmount - budgetAmount;
      const variancePercentage = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;

      variances.push({
        account_id: accountId,
        account_code: budgetLine.gl_accounts.account_code,
        account_name: budgetLine.gl_accounts.account_name,
        budget_amount: budgetAmount,
        actual_amount: actualAmount,
        variance: variance,
        variance_percentage: variancePercentage,
        status: variance > 0 ? 'over_budget' : variance < 0 ? 'under_budget' : 'on_budget'
      });

      totalBudgetVariance.budget += budgetAmount;
      totalBudgetVariance.actual += actualAmount;
    }

    totalBudgetVariance.variance = totalBudgetVariance.actual - totalBudgetVariance.budget;
    totalBudgetVariance.percentage = totalBudgetVariance.budget > 0 ? 
      (totalBudgetVariance.variance / totalBudgetVariance.budget) * 100 : 0;

    // Generate AI insights
    const insights = [];
    const recommendations = [];
    const citations = [];

    // Overall budget performance
    if (Math.abs(totalBudgetVariance.percentage) > 10) {
      insights.push({
        type: 'budget_performance',
        title: 'Significant Budget Variance',
        content: `Overall budget variance is ${totalBudgetVariance.percentage.toFixed(1)}% (${totalBudgetVariance.variance > 0 ? 'over' : 'under'} budget by £${Math.abs(totalBudgetVariance.variance).toFixed(2)}).`,
        severity: Math.abs(totalBudgetVariance.percentage) > 20 ? 'high' : 'medium'
      });
    }

    // Identify major variances
    const majorVariances = variances.filter((v: any) => Math.abs(v.variance_percentage) > 15);
    
    if (majorVariances.length > 0) {
      insights.push({
        type: 'major_variances',
        title: 'Major Account Variances',
        content: `${majorVariances.length} account(s) show variances over 15%. The largest variance is ${majorVariances[0].account_name} at ${majorVariances[0].variance_percentage.toFixed(1)}%.`,
        severity: 'medium',
        details: majorVariances.map((v: any) => ({
          account: v.account_name,
          variance_percentage: v.variance_percentage,
          variance_amount: v.variance
        }))
      });

      citations.push({
        type: 'gl_lines',
        description: 'Actual spending transactions',
        period: { start: periodStart, end: periodEnd }
      });
    }

    // Generate recommendations
    if (totalBudgetVariance.percentage > 10) {
      recommendations.push({
        type: 'budget_review',
        title: 'Review Budget Assumptions',
        content: 'Significant over-spending suggests budget assumptions may need revision for next period.',
        priority: 'medium'
      });
    }

    const overBudgetAccounts = variances.filter((v: any) => v.variance > 0 && Math.abs(v.variance_percentage) > 10);
    if (overBudgetAccounts.length > 0) {
      recommendations.push({
        type: 'cost_control',
        title: 'Implement Cost Controls',
        content: `${overBudgetAccounts.length} account(s) are significantly over budget. Review spending patterns and implement cost controls.`,
        priority: 'high',
        accounts: overBudgetAccounts.map((v: any) => v.account_name)
      });
    }

    const underBudgetAccounts = variances.filter((v: any) => v.variance < 0 && Math.abs(v.variance_percentage) > 10);
    if (underBudgetAccounts.length > 0) {
      recommendations.push({
        type: 'budget_reallocation',
        title: 'Consider Budget Reallocation',
        content: `${underBudgetAccounts.length} account(s) are significantly under budget. Consider reallocating funds to over-budget areas.`,
        priority: 'low',
        accounts: underBudgetAccounts.map((v: any) => v.account_name)
      });
    }

    // Trend analysis
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthsRemaining = 12 - currentMonth;
    const projectedYearEnd = totalBudgetVariance.actual + (totalBudgetVariance.actual / currentMonth) * monthsRemaining;
    const projectedVariance = projectedYearEnd - totalBudgetVariance.budget;

    if (projectedVariance > totalBudgetVariance.budget * 0.1) {
      recommendations.push({
        type: 'year_end_projection',
        title: 'Year-End Budget Projection',
        content: `Based on current spending trends, projected year-end variance is £${projectedVariance.toFixed(2)}. Consider immediate cost control measures.`,
        priority: 'high'
      });
    }

    const analysis = {
      summary: {
        total_budget: totalBudgetVariance.budget,
        total_actual: totalBudgetVariance.actual,
        total_variance: totalBudgetVariance.variance,
        variance_percentage: totalBudgetVariance.percentage,
        period: { start: periodStart, end: periodEnd },
        projected_year_end: projectedYearEnd,
        projected_variance: projectedVariance
      },
      variances,
      insights,
      recommendations,
      citations,
      context: {
        type: 'budget_variance_analysis',
        building_id: buildingId,
        budget_version_id: budgetVersionId,
        period
      }
    };

    // Log the AI interaction
    await supabase
      .from('ai_interactions_log')
      .insert({
        user_id: session.user.id,
        building_id: buildingId,
        query: 'Analyze budget variances',
        response: JSON.stringify(analysis),
        context_type: 'variance_analysis',
        metadata: {
          budget_version_id: budgetVersionId,
          variance_percentage: totalBudgetVariance.percentage,
          major_variances_count: majorVariances.length,
          projected_variance: projectedVariance
        }
      });

    return NextResponse.json({
      success: true,
      analysis,
      data: {
        budget: budget || [],
        actual_spending: actualSpending || []
      }
    });

  } catch (error) {
    console.error('Error in variance AI analysis:', error);
    return NextResponse.json({
      error: 'Failed to analyze variances',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
