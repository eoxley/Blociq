import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ReceiptImportSchema = z.object({
  building_id: z.string().uuid(),
  bank_account_id: z.string().uuid(),
  receipts: z.array(z.object({
    date: z.string(),
    amount: z.number(),
    payer_ref: z.string().optional(),
    raw_ref: z.string().optional(),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ReceiptImportSchema.parse(body);
    
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

    if (!userBuilding || !['owner', 'manager'].includes(userBuilding.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify bank account belongs to building
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .select('building_id')
      .eq('id', validatedData.bank_account_id)
      .eq('building_id', validatedData.building_id)
      .single();

    if (bankError || !bankAccount) {
      return NextResponse.json({ error: 'Bank account not found or access denied' }, { status: 404 });
    }

    // Create receipts
    const receipts = validatedData.receipts.map(receipt => ({
      bank_account_id: validatedData.bank_account_id,
      date: receipt.date,
      amount: receipt.amount,
      payer_ref: receipt.payer_ref,
      raw_ref: receipt.raw_ref,
    }));

    const { data: createdReceipts, error: receiptsError } = await supabase
      .from('ar_receipts')
      .insert(receipts)
      .select();

    if (receiptsError) {
      return NextResponse.json({ error: 'Failed to create receipts' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      receipts: createdReceipts,
      count: createdReceipts.length,
    });

  } catch (error) {
    console.error('Error importing receipts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
