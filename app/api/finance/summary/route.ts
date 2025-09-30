import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const FinanceSummarySchema = z.object({
  building_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');

    const validatedData = FinanceSummarySchema.parse({
      building_id: buildingId,
    });
    
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
      .eq('building_id', validatedData.building_id)
      .eq('user_id', user.id)
      .single();

    if (!userBuilding) {
      return NextResponse.json({ error: 'Building access denied' }, { status: 403 });
    }

    const currentYear = new Date().getFullYear();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get current arrears total and overdue units
    const { data: arrearsData, error: arrearsError } = await supabase
      .from('ar_demand_headers')
      .select(`
        id,
        total,
        unit_id,
        units!inner (
          id,
          unit_number,
          building_id
        )
      `)
      .eq('units.building_id', validatedData.building_id)
      .in('status', ['sent', 'part-paid'])
      .lt('period_end', ninetyDaysAgo.toISOString().split('T')[0]);

    if (arrearsError) {
      return NextResponse.json({ error: 'Failed to fetch arrears data' }, { status: 500 });
    }

    // Calculate arrears totals
    const totalArrears = arrearsData?.reduce((sum, demand) => {
      // Get paid amount for this demand
      const paidAmount = 0; // Would need to calculate from allocations
      return sum + (demand.total - paidAmount);
    }, 0) || 0;

    // Get overdue units (>90 days)
    const overdueUnits = arrearsData?.map(demand => ({
      unit_id: demand.unit_id,
      unit_number: demand.units.unit_number,
      amount: demand.total,
      days_overdue: Math.floor((new Date().getTime() - new Date(demand.period_end).getTime()) / (1000 * 60 * 60 * 24)),
    })) || [];

    // Get budget vs actual by category for current year
    const { data: budgetData, error: budgetError } = await supabase
      .from('budget_lines')
      .select(`
        amount,
        gl_accounts!inner (
          id,
          code,
          name,
          type
        ),
        budget_versions!inner (
          year
        )
      `)
      .eq('budget_versions.year', currentYear)
      .eq('budget_versions.building_id', validatedData.building_id);

    if (budgetError) {
      return NextResponse.json({ error: 'Failed to fetch budget data' }, { status: 500 });
    }

    // Get actual spending from GL journals
    const { data: actualData, error: actualError } = await supabase
      .from('gl_lines')
      .select(`
        debit,
        credit,
        gl_accounts!inner (
          id,
          code,
          name,
          type
        ),
        gl_journals!inner (
          date,
          building_id
        )
      `)
      .eq('gl_journals.building_id', validatedData.building_id)
      .gte('gl_journals.date', `${currentYear}-01-01`)
      .lte('gl_journals.date', `${currentYear}-12-31`);

    if (actualError) {
      return NextResponse.json({ error: 'Failed to fetch actual data' }, { status: 500 });
    }

    // Group budget and actual by category
    const budgetByCategory = new Map();
    const actualByCategory = new Map();

    // Process budget data
    budgetData?.forEach(line => {
      const category = getCategoryFromAccount(line.gl_accounts);
      if (!budgetByCategory.has(category)) {
        budgetByCategory.set(category, 0);
      }
      budgetByCategory.set(category, budgetByCategory.get(category) + line.amount);
    });

    // Process actual data
    actualData?.forEach(line => {
      const category = getCategoryFromAccount(line.gl_accounts);
      if (!actualByCategory.has(category)) {
        actualByCategory.set(category, 0);
      }
      const amount = line.debit > 0 ? line.debit : line.credit;
      actualByCategory.set(category, actualByCategory.get(category) + amount);
    });

    // Combine budget vs actual
    const budgetVsActual = Array.from(new Set([...budgetByCategory.keys(), ...actualByCategory.keys()]))
      .map(category => ({
        category,
        budget: budgetByCategory.get(category) || 0,
        actual: actualByCategory.get(category) || 0,
        variance: (actualByCategory.get(category) || 0) - (budgetByCategory.get(category) || 0),
        variancePercent: budgetByCategory.get(category) 
          ? ((actualByCategory.get(category) || 0) - (budgetByCategory.get(category) || 0)) / budgetByCategory.get(category) * 100
          : 0,
      }));

    // Get reserve fund balance
    const { data: reserveFund, error: reserveError } = await supabase
      .from('funds')
      .select(`
        id,
        name,
        gl_accounts!inner (
          id
        )
      `)
      .eq('building_id', validatedData.building_id)
      .eq('name', 'Reserve')
      .single();

    let reserveBalance = 0;
    if (reserveFund && !reserveError) {
      // Get current balance from GL
      const { data: reserveBalanceData } = await supabase
        .from('gl_lines')
        .select('debit, credit')
        .eq('account_id', reserveFund.gl_accounts.id);

      if (reserveBalanceData) {
        reserveBalance = reserveBalanceData.reduce((sum, line) => sum + line.debit - line.credit, 0);
      }
    }

    // Get next 3 deadlines
    const deadlines = [
      {
        id: 'budget-approval',
        title: 'Budget Approval',
        due_date: `${currentYear + 1}-01-31`,
        type: 'budget',
        status: getDeadlineStatus(`${currentYear + 1}-01-31`),
      },
      {
        id: 'year-end-accounts',
        title: 'Year End Accounts',
        due_date: `${currentYear}-12-31`,
        type: 'accounts',
        status: getDeadlineStatus(`${currentYear}-12-31`),
      },
      {
        id: 'audit',
        title: 'Annual Audit',
        due_date: `${currentYear + 1}-03-31`,
        type: 'audit',
        status: getDeadlineStatus(`${currentYear + 1}-03-31`),
      },
    ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
     .slice(0, 3);

    return NextResponse.json({
      success: true,
      data: {
        arrears: {
          total: totalArrears,
          overdue_units: overdueUnits,
        },
        budget_vs_actual: budgetVsActual,
        reserve_fund: {
          balance: reserveBalance,
          fund_id: reserveFund?.id,
        },
        deadlines,
        building_id: validatedData.building_id,
        year: currentYear,
      },
    });

  } catch (error) {
    console.error('Error fetching finance summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to categorize accounts
function getCategoryFromAccount(account: any): string {
  const code = account.code;
  const name = account.name.toLowerCase();
  
  if (code.startsWith('50') || name.includes('repair') || name.includes('maintenance')) {
    return 'Repairs & Maintenance';
  }
  if (code.startsWith('51') || name.includes('insurance')) {
    return 'Insurance';
  }
  if (code.startsWith('52') || name.includes('professional') || name.includes('legal')) {
    return 'Professional Fees';
  }
  if (code.startsWith('53') || name.includes('management')) {
    return 'Management';
  }
  if (code.startsWith('54') || name.includes('utility')) {
    return 'Utilities';
  }
  if (code.startsWith('55') || name.includes('security')) {
    return 'Security';
  }
  if (code.startsWith('56') || name.includes('clean')) {
    return 'Cleaning';
  }
  if (code.startsWith('57') || name.includes('ground')) {
    return 'Grounds Maintenance';
  }
  if (code.startsWith('58') || name.includes('major works')) {
    return 'Major Works';
  }
  if (code.startsWith('59') || name.includes('admin')) {
    return 'Administrative';
  }
  
  return 'Other';
}

// Helper function to determine deadline status
function getDeadlineStatus(dueDate: string): 'green' | 'amber' | 'red' {
  const due = new Date(dueDate);
  const now = new Date();
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue < 0) return 'red';
  if (daysUntilDue <= 30) return 'amber';
  return 'green';
}


