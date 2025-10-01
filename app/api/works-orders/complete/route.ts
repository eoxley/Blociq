import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CompleteWorksOrderSchema = z.object({
  wo_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CompleteWorksOrderSchema.parse(body);
    
    const supabase = createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get works order details
    const { data: worksOrder, error: woError } = await supabase
      .from('works_orders')
      .select(`
        *,
        contractors (name),
        buildings (name),
        user_buildings!inner (
          user_id,
          role
        )
      `)
      .eq('id', validatedData.wo_id)
      .eq('user_buildings.user_id', user.id)
      .single();

    if (woError || !worksOrder) {
      return NextResponse.json({ error: 'Works order not found or access denied' }, { status: 404 });
    }

    // Check if user has permission to complete
    if (!['owner', 'manager'].includes(worksOrder.user_buildings.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to complete works order' }, { status: 403 });
    }

    // Check if works order is in issued or in_progress status
    if (!['issued', 'in_progress'].includes(worksOrder.status)) {
      return NextResponse.json({ 
        error: `Works order cannot be completed. Current status: ${worksOrder.status}` 
      }, { status: 400 });
    }

    // Update works order status
    const { error: updateError } = await supabase
      .from('works_orders')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedData.wo_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to complete works order' }, { status: 500 });
    }

    // Get updated works order
    const { data: updatedWO, error: fetchError } = await supabase
      .from('works_orders')
      .select(`
        *,
        works_order_lines (*),
        contractors (name),
        buildings (name)
      `)
      .eq('id', validatedData.wo_id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch updated works order' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Works order completed successfully',
      works_order: updatedWO,
    });

  } catch (error) {
    console.error('Error completing works order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}




