import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const BankImportSchema = z.object({
  bank_account_id: z.string().uuid(),
  period_start: z.string(),
  period_end: z.string(),
  opening_balance: z.number(),
  closing_balance: z.number(),
  transactions: z.array(z.object({
    date: z.string(),
    amount: z.number(),
    description: z.string(),
    external_ref: z.string().optional(),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = BankImportSchema.parse(body);
    
    const supabase = await createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to bank account
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .select(`
        id,
        building_id,
        user_buildings!inner (
          user_id,
          role
        )
      `)
      .eq('id', validatedData.bank_account_id)
      .eq('user_buildings.user_id', user.id)
      .single();

    if (bankError || !bankAccount) {
      return NextResponse.json({ error: 'Bank account not found or access denied' }, { status: 404 });
    }

    if (!['owner', 'manager'].includes(bankAccount.user_buildings.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if statement already exists for this period
    const { data: existingStatement } = await supabase
      .from('bank_statements')
      .select('id')
      .eq('bank_account_id', validatedData.bank_account_id)
      .eq('period_start', validatedData.period_start)
      .eq('period_end', validatedData.period_end)
      .single();

    if (existingStatement) {
      return NextResponse.json({ 
        error: 'Statement already exists for this period',
        statement_id: existingStatement.id 
      }, { status: 409 });
    }

    // Validate statement totals
    const transactionTotal = validatedData.transactions.reduce((sum, txn) => sum + txn.amount, 0);
    const expectedClosing = validatedData.opening_balance + transactionTotal;
    
    if (Math.abs(expectedClosing - validatedData.closing_balance) > 0.01) {
      return NextResponse.json({ 
        error: `Statement totals don't balance. Expected closing: ${expectedClosing}, Actual: ${validatedData.closing_balance}` 
      }, { status: 400 });
    }

    // Create bank statement
    const { data: statement, error: statementError } = await supabase
      .from('bank_statements')
      .insert({
        bank_account_id: validatedData.bank_account_id,
        period_start: validatedData.period_start,
        period_end: validatedData.period_end,
        opening_balance: validatedData.opening_balance,
        closing_balance: validatedData.closing_balance,
      })
      .select()
      .single();

    if (statementError) {
      return NextResponse.json({ error: 'Failed to create bank statement' }, { status: 500 });
    }

    // Create bank transactions
    const transactions = validatedData.transactions.map(txn => ({
      bank_account_id: validatedData.bank_account_id,
      statement_id: statement.id,
      date: txn.date,
      amount: txn.amount,
      description: txn.description,
      external_ref: txn.external_ref,
    }));

    const { data: createdTransactions, error: transactionsError } = await supabase
      .from('bank_txns')
      .insert(transactions)
      .select();

    if (transactionsError) {
      // Rollback statement if transactions fail
      await supabase
        .from('bank_statements')
        .delete()
        .eq('id', statement.id);
      
      return NextResponse.json({ error: 'Failed to create bank transactions' }, { status: 500 });
    }

    // Log audit trail
    await supabase
      .from('audit_log')
      .insert({
        actor: user.id,
        entity: 'bank_statement',
        action: 'import',
        details: {
          statement_id: statement.id,
          transaction_count: createdTransactions.length,
          period_start: validatedData.period_start,
          period_end: validatedData.period_end,
        },
      });

    return NextResponse.json({
      success: true,
      statement: {
        id: statement.id,
        period_start: statement.period_start,
        period_end: statement.period_end,
        opening_balance: statement.opening_balance,
        closing_balance: statement.closing_balance,
        transaction_count: createdTransactions.length,
      },
      transactions: createdTransactions,
    });

  } catch (error) {
    console.error('Error importing bank statement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// CSV parsing helper function
export function parseCSVBankStatement(csvContent: string): {
  period_start: string;
  period_end: string;
  opening_balance: number;
  closing_balance: number;
  transactions: Array<{
    date: string;
    amount: number;
    description: string;
    external_ref?: string;
  }>;
} {
  const lines = csvContent.trim().split('\n');
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Expected CSV format: Date,Description,Amount,Reference
  const dateIndex = header.findIndex(h => h.includes('date'));
  const descIndex = header.findIndex(h => h.includes('description') || h.includes('desc'));
  const amountIndex = header.findIndex(h => h.includes('amount') || h.includes('value'));
  const refIndex = header.findIndex(h => h.includes('reference') || h.includes('ref'));

  if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
    throw new Error('Invalid CSV format. Expected columns: Date, Description, Amount, Reference');
  }

  const transactions = [];
  let minDate = null;
  let maxDate = null;
  let runningBalance = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(cell => cell.trim());
    if (row.length < 3) continue;

    const date = row[dateIndex];
    const description = row[descIndex];
    const amount = parseFloat(row[amountIndex].replace(/[£,]/g, ''));
    const reference = refIndex !== -1 ? row[refIndex] : undefined;

    if (isNaN(amount)) continue;

    transactions.push({
      date,
      amount,
      description,
      external_ref: reference,
    });

    // Track date range
    const txDate = new Date(date);
    if (!minDate || txDate < minDate) minDate = txDate;
    if (!maxDate || txDate > maxDate) maxDate = txDate;

    runningBalance += amount;
  }

  if (transactions.length === 0) {
    throw new Error('No valid transactions found in CSV');
  }

  return {
    period_start: minDate.toISOString().split('T')[0],
    period_end: maxDate.toISOString().split('T')[0],
    opening_balance: 0, // Would need to be provided separately
    closing_balance: runningBalance,
    transactions,
  };
}


