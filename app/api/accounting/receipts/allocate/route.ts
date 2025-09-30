import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { accountingPosting } from '@/lib/accounting/posting';
import { z } from 'zod';

const AllocateReceiptSchema = z.object({
  receipt_id: z.string().uuid(),
  allocations: z.array(z.object({
    demand_header_id: z.string().uuid(),
    amount: z.number().min(0),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = AllocateReceiptSchema.parse(body);
    
    const supabase = await createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify receipt exists and user has access
    const { data: receipt, error: receiptError } = await supabase
      .from('ar_receipts')
      .select(`
        *,
        bank_accounts!inner (
          building_id
        )
      `)
      .eq('id', validatedData.receipt_id)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    // Verify user has access to building
    const { data: userBuilding } = await supabase
      .from('user_buildings')
      .select('role')
      .eq('building_id', receipt.bank_accounts.building_id)
      .eq('user_id', user.id)
      .single();

    if (!userBuilding || !['owner', 'manager'].includes(userBuilding.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate allocation amounts
    const totalAllocated = validatedData.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    if (Math.abs(totalAllocated - receipt.amount) > 0.01) {
      return NextResponse.json({ 
        error: `Allocation total (${totalAllocated}) must equal receipt amount (${receipt.amount})` 
      }, { status: 400 });
    }

    // Verify all demand headers exist and belong to the same building
    const demandHeaderIds = validatedData.allocations.map(alloc => alloc.demand_header_id);
    const { data: demandHeaders, error: demandError } = await supabase
      .from('ar_demand_headers')
      .select('id, building_id, total')
      .in('id', demandHeaderIds);

    if (demandError) {
      return NextResponse.json({ error: 'Failed to fetch demand headers' }, { status: 500 });
    }

    if (demandHeaders.length !== demandHeaderIds.length) {
      return NextResponse.json({ error: 'One or more demand headers not found' }, { status: 404 });
    }

    // Check all demands belong to the same building
    const buildingIds = [...new Set(demandHeaders.map(dh => dh.building_id))];
    if (buildingIds.length > 1 || buildingIds[0] !== receipt.bank_accounts.building_id) {
      return NextResponse.json({ error: 'All demand headers must belong to the same building as the receipt' }, { status: 400 });
    }

    // Check for over-allocation
    for (const allocation of validatedData.allocations) {
      const demandHeader = demandHeaders.find(dh => dh.id === allocation.demand_header_id);
      if (!demandHeader) continue;

      // Get existing allocations for this demand
      const { data: existingAllocations, error: existingError } = await supabase
        .from('ar_allocations')
        .select('amount')
        .eq('demand_header_id', allocation.demand_header_id);

      if (existingError) {
        return NextResponse.json({ error: 'Failed to fetch existing allocations' }, { status: 500 });
      }

      const totalAllocated = existingAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const remainingAmount = demandHeader.total - totalAllocated;

      if (allocation.amount > remainingAmount) {
        return NextResponse.json({ 
          error: `Allocation amount (${allocation.amount}) exceeds remaining demand amount (${remainingAmount}) for demand ${allocation.demand_header_id}` 
        }, { status: 400 });
      }
    }

    // Post the receipt using the posting service
    const result = await accountingPosting.postReceipt({
      receipt_id: validatedData.receipt_id,
      allocations: validatedData.allocations,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Update demand statuses based on allocations
    for (const allocation of validatedData.allocations) {
      const demandHeader = demandHeaders.find(dh => dh.id === allocation.demand_header_id);
      if (!demandHeader) continue;

      // Get total allocated amount for this demand
      const { data: allAllocations, error: allAllocError } = await supabase
        .from('ar_allocations')
        .select('amount')
        .eq('demand_header_id', allocation.demand_header_id);

      if (allAllocError) {
        console.error('Failed to fetch all allocations:', allAllocError);
        continue;
      }

      const totalAllocated = allAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      let newStatus = 'part-paid';

      if (Math.abs(totalAllocated - demandHeader.total) < 0.01) {
        newStatus = 'paid';
      }

      // Update demand status
      await supabase
        .from('ar_demand_headers')
        .update({ status: newStatus })
        .eq('id', allocation.demand_header_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Receipt allocated successfully',
    });

  } catch (error) {
    console.error('Error allocating receipt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
