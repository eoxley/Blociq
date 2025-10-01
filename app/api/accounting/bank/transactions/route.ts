import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const GetTransactionsSchema = z.object({
  bank_account_id: z.string().uuid(),
  reconciled: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get('bank_account_id');
    const reconciled = searchParams.get('reconciled');
    const limit = searchParams.get('limit');

    const validatedData = GetTransactionsSchema.parse({
      bank_account_id: bankAccountId,
      reconciled: reconciled ? reconciled === 'true' : undefined,
      limit: limit ? parseInt(limit) : 50,
    });
    
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

    // Build query
    let query = supabase
      .from('bank_txns')
      .select('*')
      .eq('bank_account_id', validatedData.bank_account_id)
      .order('date', { ascending: false })
      .limit(validatedData.limit);

    // Add reconciled filter if specified
    if (validatedData.reconciled !== undefined) {
      query = query.eq('reconciled', validatedData.reconciled);
    }

    const { data: transactions, error: transactionsError } = await query;

    if (transactionsError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
      count: transactions?.length || 0,
    });

  } catch (error) {
    console.error('Error fetching bank transactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}




