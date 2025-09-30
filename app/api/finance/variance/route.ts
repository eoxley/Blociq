import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const VarianceSchema = z.object({
  building_id: z.string().uuid(),
  account_id: z.string().uuid().optional(),
  category: z.string().optional(),
  year: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');
    const accountId = searchParams.get('account_id');
    const category = searchParams.get('category');
    const year = searchParams.get('year');

    const validatedData = VarianceSchema.parse({
      building_id: buildingId,
      account_id: accountId,
      category: category,
      year: year ? parseInt(year) : new Date().getFullYear(),
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

    // Get budget data
    let budgetQuery = supabase
      .from('budget_lines')
      .select(`
        amount,
        narrative,
        gl_accounts!inner (
          id,
          code,
          name,
          type
        ),
        budget_versions!inner (
          year,
          building_id
        )
      `)
      .eq('budget_versions.building_id', validatedData.building_id)
      .eq('budget_versions.year', validatedData.year);

    if (validatedData.account_id) {
      budgetQuery = budgetQuery.eq('account_id', validatedData.account_id);
    }

    const { data: budgetData, error: budgetError } = await budgetQuery;

    if (budgetError) {
      return NextResponse.json({ error: 'Failed to fetch budget data' }, { status: 500 });
    }

    // Get actual data from GL journals
    let actualQuery = supabase
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
          building_id,
          memo
        )
      `)
      .eq('gl_journals.building_id', validatedData.building_id)
      .gte('gl_journals.date', `${validatedData.year}-01-01`)
      .lte('gl_journals.date', `${validatedData.year}-12-31`);

    if (validatedData.account_id) {
      actualQuery = actualQuery.eq('account_id', validatedData.account_id);
    }

    const { data: actualData, error: actualError } = await actualQuery;

    if (actualError) {
      return NextResponse.json({ error: 'Failed to fetch actual data' }, { status: 500 });
    }

    // Process data by account
    const accountVariances = new Map();

    // Process budget data
    budgetData?.forEach(line => {
      const accountId = line.gl_accounts.id;
      if (!accountVariances.has(accountId)) {
        accountVariances.set(accountId, {
          account_id: accountId,
          account_code: line.gl_accounts.code,
          account_name: line.gl_accounts.name,
          account_type: line.gl_accounts.type,
          budget: 0,
          actual: 0,
          narrative: line.narrative || '',
          transactions: [],
        });
      }
      accountVariances.get(accountId).budget += line.amount;
    });

    // Process actual data
    actualData?.forEach(line => {
      const accountId = line.gl_accounts.id;
      if (!accountVariances.has(accountId)) {
        accountVariances.set(accountId, {
          account_id: accountId,
          account_code: line.gl_accounts.code,
          account_name: line.gl_accounts.name,
          account_type: line.gl_accounts.type,
          budget: 0,
          actual: 0,
          narrative: '',
          transactions: [],
        });
      }
      
      const amount = line.debit > 0 ? line.debit : line.credit;
      accountVariances.get(accountId).actual += amount;
      
      // Add transaction details
      accountVariances.get(accountId).transactions.push({
        date: line.gl_journals.date,
        amount: amount,
        memo: line.gl_journals.memo,
        type: line.debit > 0 ? 'debit' : 'credit',
      });
    });

    // Calculate variances and filter by category if specified
    const variances = Array.from(accountVariances.values())
      .map(account => ({
        ...account,
        variance: account.actual - account.budget,
        variance_percent: account.budget > 0 
          ? ((account.actual - account.budget) / account.budget) * 100 
          : 0,
        category: getCategoryFromAccount(account),
      }))
      .filter(account => {
        if (validatedData.category) {
          return account.category === validatedData.category;
        }
        return true;
      })
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    // Calculate totals
    const totals = {
      budget: variances.reduce((sum, account) => sum + account.budget, 0),
      actual: variances.reduce((sum, account) => sum + account.actual, 0),
      variance: variances.reduce((sum, account) => sum + account.variance, 0),
    };
    totals.variance_percent = totals.budget > 0 
      ? (totals.variance / totals.budget) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        variances,
        totals,
        filters: {
          building_id: validatedData.building_id,
          account_id: validatedData.account_id,
          category: validatedData.category,
          year: validatedData.year,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching variance data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to categorize accounts
function getCategoryFromAccount(account: any): string {
  const code = account.account_code;
  const name = account.account_name.toLowerCase();
  
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


