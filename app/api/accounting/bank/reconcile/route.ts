import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { accountingPosting } from '@/lib/accounting/posting';
import { z } from 'zod';

const ReconcileTransactionSchema = z.object({
  bank_txn_id: z.string().uuid(),
  target_entity: z.enum(['ar_receipt', 'ap_payment']),
  target_id: z.string().uuid(),
  override_amount_mismatch: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ReconcileTransactionSchema.parse(body);
    
    const supabase = await createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get bank transaction details
    const { data: bankTxn, error: txnError } = await supabase
      .from('bank_txns')
      .select(`
        *,
        bank_accounts!inner (
          building_id,
          user_buildings!inner (
            user_id,
            role
          )
        )
      `)
      .eq('id', validatedData.bank_txn_id)
      .eq('bank_accounts.user_buildings.user_id', user.id)
      .single();

    if (txnError || !bankTxn) {
      return NextResponse.json({ error: 'Bank transaction not found or access denied' }, { status: 404 });
    }

    if (!['owner', 'manager'].includes(bankTxn.bank_accounts.user_buildings.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if already reconciled
    if (bankTxn.reconciled) {
      return NextResponse.json({ 
        error: 'Transaction is already reconciled',
        current_match: {
          entity: bankTxn.matched_entity,
          id: bankTxn.matched_id,
        }
      }, { status: 409 });
    }

    let targetEntity;
    let targetAmount;

    // Validate target entity and get amount
    if (validatedData.target_entity === 'ar_receipt') {
      const { data: receipt, error: receiptError } = await supabase
        .from('ar_receipts')
        .select(`
          *,
          bank_accounts!inner (
            building_id
          )
        `)
        .eq('id', validatedData.target_id)
        .eq('bank_accounts.building_id', bankTxn.bank_accounts.building_id)
        .single();

      if (receiptError || !receipt) {
        return NextResponse.json({ error: 'AR receipt not found or access denied' }, { status: 404 });
      }

      // Check if receipt is already reconciled
      const { data: existingMatch } = await supabase
        .from('bank_txns')
        .select('id')
        .eq('matched_entity', 'ar_receipt')
        .eq('matched_id', validatedData.target_id)
        .eq('reconciled', true)
        .single();

      if (existingMatch) {
        return NextResponse.json({ error: 'AR receipt is already reconciled' }, { status: 409 });
      }

      targetEntity = receipt;
      targetAmount = receipt.amount;
    } else if (validatedData.target_entity === 'ap_payment') {
      const { data: payment, error: paymentError } = await supabase
        .from('ap_payments')
        .select(`
          *,
          bank_accounts!inner (
            building_id
          )
        `)
        .eq('id', validatedData.target_id)
        .eq('bank_accounts.building_id', bankTxn.bank_accounts.building_id)
        .single();

      if (paymentError || !payment) {
        return NextResponse.json({ error: 'AP payment not found or access denied' }, { status: 404 });
      }

      // Check if payment is already reconciled
      const { data: existingMatch } = await supabase
        .from('bank_txns')
        .select('id')
        .eq('matched_entity', 'ap_payment')
        .eq('matched_id', validatedData.target_id)
        .eq('reconciled', true)
        .single();

      if (existingMatch) {
        return NextResponse.json({ error: 'AP payment is already reconciled' }, { status: 409 });
      }

      targetEntity = payment;
      targetAmount = payment.amount;
    }

    // Validate amounts match
    const expectedAmount = validatedData.target_entity === 'ap_payment' ? -targetAmount : targetAmount;
    if (!validatedData.override_amount_mismatch && Math.abs(bankTxn.amount - expectedAmount) > 0.01) {
      return NextResponse.json({ 
        error: `Amount mismatch. Bank: ${bankTxn.amount}, ${validatedData.target_entity}: ${expectedAmount}`,
        bank_amount: bankTxn.amount,
        target_amount: expectedAmount,
        difference: bankTxn.amount - expectedAmount,
      }, { status: 400 });
    }

    // Update bank transaction with reconciliation
    const { error: updateError } = await supabase
      .from('bank_txns')
      .update({
        reconciled: true,
        matched_entity: validatedData.target_entity,
        matched_id: validatedData.target_id,
      })
      .eq('id', validatedData.bank_txn_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to reconcile transaction' }, { status: 500 });
    }

    // Post reconciliation journal
    let journalResult;
    if (validatedData.target_entity === 'ar_receipt') {
      journalResult = await accountingPosting.postBankReceipt(
        validatedData.target_id,
        validatedData.bank_txn_id
      );
    } else {
      journalResult = await accountingPosting.postBankPayment(
        validatedData.target_id,
        validatedData.bank_txn_id
      );
    }

    if (!journalResult.success) {
      // Rollback reconciliation if journal posting fails
      await supabase
        .from('bank_txns')
        .update({
          reconciled: false,
          matched_entity: null,
          matched_id: null,
        })
        .eq('id', validatedData.bank_txn_id);
      
      return NextResponse.json({ error: journalResult.error }, { status: 400 });
    }

    // Log audit trail
    await supabase
      .from('audit_log')
      .insert({
        actor: user.id,
        entity: 'bank_txns',
        action: 'reconcile',
        details: {
          bank_txn_id: validatedData.bank_txn_id,
          matched_entity: validatedData.target_entity,
          matched_id: validatedData.target_id,
          amount: bankTxn.amount,
          journal_id: journalResult.journal_id,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Transaction reconciled successfully',
      reconciliation: {
        bank_txn_id: validatedData.bank_txn_id,
        matched_entity: validatedData.target_entity,
        matched_id: validatedData.target_id,
        amount: bankTxn.amount,
        journal_id: journalResult.journal_id,
      },
    });

  } catch (error) {
    console.error('Error reconciling transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get reconciliation suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bankTxnId = searchParams.get('bank_txn_id');
    const matchType = searchParams.get('match_type') || 'both';
    
    if (!bankTxnId) {
      return NextResponse.json({ error: 'bank_txn_id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to transaction
    const { data: bankTxn, error: txnError } = await supabase
      .from('bank_txns')
      .select(`
        *,
        bank_accounts!inner (
          building_id,
          user_buildings!inner (
            user_id,
            role
          )
        )
      `)
      .eq('id', bankTxnId)
      .eq('bank_accounts.user_buildings.user_id', user.id)
      .single();

    if (txnError || !bankTxn) {
      return NextResponse.json({ error: 'Bank transaction not found or access denied' }, { status: 404 });
    }

    // Get suggestions using the database function
    const { data: suggestions, error: suggestionsError } = await supabase
      .rpc('suggest_reconciliation_matches', {
        txn_uuid: bankTxnId,
        match_type: matchType
      });

    if (suggestionsError) {
      return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions || [],
    });

  } catch (error) {
    console.error('Error getting reconciliation suggestions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}




