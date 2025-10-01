import { createClient } from '@/lib/supabase/server';

export class FinanceQueries {
  private supabase = createClient();

  /**
   * Get arrears data for a building
   */
  async getArrearsData(buildingId: string): Promise<{
    total: number;
    overdue_units: Array<{
      unit_id: string;
      unit_number: string;
      amount: number;
      days_overdue: number;
    }>;
  }> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get overdue demands
    const { data: arrearsData, error: arrearsError } = await this.supabase
      .from('ar_demand_headers')
      .select(`
        id,
        total,
        unit_id,
        period_end,
        units!inner (
          id,
          unit_number,
          building_id
        )
      `)
      .eq('units.building_id', buildingId)
      .in('status', ['sent', 'part-paid'])
      .lt('period_end', ninetyDaysAgo.toISOString().split('T')[0]);

    if (arrearsError) {
      throw new Error('Failed to fetch arrears data');
    }

    // Calculate totals and overdue units
    let totalArrears = 0;
    const overdueUnits = [];

    for (const demand of arrearsData || []) {
      // Get paid amount for this demand
      const { data: allocations } = await this.supabase
        .from('ar_allocations')
        .select('amount')
        .eq('demand_header_id', demand.id);

      const paidAmount = allocations?.reduce((sum, alloc) => sum + alloc.amount, 0) || 0;
      const outstandingAmount = demand.total - paidAmount;
      
      if (outstandingAmount > 0) {
        totalArrears += outstandingAmount;
        overdueUnits.push({
          unit_id: demand.unit_id,
          unit_number: demand.units.unit_number,
          amount: outstandingAmount,
          days_overdue: Math.floor((new Date().getTime() - new Date(demand.period_end).getTime()) / (1000 * 60 * 60 * 24)),
        });
      }
    }

    return {
      total: totalArrears,
      overdue_units: overdueUnits,
    };
  }

  /**
   * Get budget vs actual data for a building
   */
  async getBudgetVsActual(buildingId: string, year: number): Promise<Array<{
    category: string;
    budget: number;
    actual: number;
    variance: number;
    variancePercent: number;
  }>> {
    // Get budget data
    const { data: budgetData, error: budgetError } = await this.supabase
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
      .eq('budget_versions.year', year)
      .eq('budget_versions.building_id', buildingId);

    if (budgetError) {
      throw new Error('Failed to fetch budget data');
    }

    // Get actual data from GL journals
    const { data: actualData, error: actualError } = await this.supabase
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
      .eq('gl_journals.building_id', buildingId)
      .gte('gl_journals.date', `${year}-01-01`)
      .lte('gl_journals.date', `${year}-12-31`);

    if (actualError) {
      throw new Error('Failed to fetch actual data');
    }

    // Group by category
    const budgetByCategory = new Map();
    const actualByCategory = new Map();

    // Process budget data
    budgetData?.forEach(line => {
      const category = this.getCategoryFromAccount(line.gl_accounts);
      if (!budgetByCategory.has(category)) {
        budgetByCategory.set(category, 0);
      }
      budgetByCategory.set(category, budgetByCategory.get(category) + line.amount);
    });

    // Process actual data
    actualData?.forEach(line => {
      const category = this.getCategoryFromAccount(line.gl_accounts);
      if (!actualByCategory.has(category)) {
        actualByCategory.set(category, 0);
      }
      const amount = line.debit > 0 ? line.debit : line.credit;
      actualByCategory.set(category, actualByCategory.get(category) + amount);
    });

    // Combine data
    return Array.from(new Set([...budgetByCategory.keys(), ...actualByCategory.keys()]))
      .map(category => ({
        category,
        budget: budgetByCategory.get(category) || 0,
        actual: actualByCategory.get(category) || 0,
        variance: (actualByCategory.get(category) || 0) - (budgetByCategory.get(category) || 0),
        variancePercent: budgetByCategory.get(category) 
          ? ((actualByCategory.get(category) || 0) - (budgetByCategory.get(category) || 0)) / budgetByCategory.get(category) * 100
          : 0,
      }));
  }

  /**
   * Get reserve fund balance
   */
  async getReserveFundBalance(buildingId: string): Promise<{
    balance: number;
    fund_id: string | null;
  }> {
    // Get reserve fund
    const { data: reserveFund, error: reserveError } = await this.supabase
      .from('funds')
      .select(`
        id,
        name,
        gl_accounts!inner (
          id
        )
      `)
      .eq('building_id', buildingId)
      .eq('name', 'Reserve')
      .single();

    if (reserveError || !reserveFund) {
      return { balance: 0, fund_id: null };
    }

    // Get current balance from GL
    const { data: balanceData, error: balanceError } = await this.supabase
      .from('gl_lines')
      .select('debit, credit')
      .eq('account_id', reserveFund.gl_accounts.id);

    if (balanceError) {
      throw new Error('Failed to fetch reserve fund balance');
    }

    const balance = balanceData?.reduce((sum, line) => sum + line.debit - line.credit, 0) || 0;

    return {
      balance,
      fund_id: reserveFund.id,
    };
  }

  /**
   * Get variance detail for a specific category
   */
  async getVarianceDetail(buildingId: string, category: string, year: number): Promise<{
    variances: Array<{
      account_id: string;
      account_code: string;
      account_name: string;
      budget: number;
      actual: number;
      variance: number;
      variance_percent: number;
      narrative: string;
      transactions: Array<{
        date: string;
        amount: number;
        memo: string;
        type: string;
      }>;
    }>;
    totals: {
      budget: number;
      actual: number;
      variance: number;
      variance_percent: number;
    };
  }> {
    // Get budget data
    const { data: budgetData, error: budgetError } = await this.supabase
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
      .eq('budget_versions.building_id', buildingId)
      .eq('budget_versions.year', year);

    if (budgetError) {
      throw new Error('Failed to fetch budget data');
    }

    // Get actual data
    const { data: actualData, error: actualError } = await this.supabase
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
      .eq('gl_journals.building_id', buildingId)
      .gte('gl_journals.date', `${year}-01-01`)
      .lte('gl_journals.date', `${year}-12-31`);

    if (actualError) {
      throw new Error('Failed to fetch actual data');
    }

    // Process data by account
    const accountVariances = new Map();

    // Process budget data
    budgetData?.forEach(line => {
      const accountId = line.gl_accounts.id;
      const accountCategory = this.getCategoryFromAccount(line.gl_accounts);
      
      if (accountCategory === category) {
        if (!accountVariances.has(accountId)) {
          accountVariances.set(accountId, {
            account_id: accountId,
            account_code: line.gl_accounts.code,
            account_name: line.gl_accounts.name,
            budget: 0,
            actual: 0,
            narrative: line.narrative || '',
            transactions: [],
          });
        }
        accountVariances.get(accountId).budget += line.amount;
      }
    });

    // Process actual data
    actualData?.forEach(line => {
      const accountId = line.gl_accounts.id;
      const accountCategory = this.getCategoryFromAccount(line.gl_accounts);
      
      if (accountCategory === category) {
        if (!accountVariances.has(accountId)) {
          accountVariances.set(accountId, {
            account_id: accountId,
            account_code: line.gl_accounts.code,
            account_name: line.gl_accounts.name,
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
      }
    });

    // Calculate variances
    const variances = Array.from(accountVariances.values())
      .map(account => ({
        ...account,
        variance: account.actual - account.budget,
        variance_percent: account.budget > 0 
          ? ((account.actual - account.budget) / account.budget) * 100 
          : 0,
      }))
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

    return { variances, totals };
  }

  /**
   * Helper function to categorize accounts
   */
  private getCategoryFromAccount(account: any): string {
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
}

// Export singleton instance
export const financeQueries = new FinanceQueries();




