import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ApproveWorksOrderSchema = z.object({
  wo_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ApproveWorksOrderSchema.parse(body);
    
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
        contractors (id, name),
        buildings (id, name),
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

    // Check if user has permission to approve
    if (!['owner', 'manager'].includes(worksOrder.user_buildings.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to approve works order' }, { status: 403 });
    }

    // Check if works order is in draft status
    if (worksOrder.status !== 'draft') {
      return NextResponse.json({ 
        error: `Works order is not in draft status. Current status: ${worksOrder.status}` 
      }, { status: 400 });
    }

    // Check contractor insurance validity
    const { data: insuranceValid, error: insuranceError } = await supabase
      .rpc('check_contractor_insurance', {
        contractor_uuid: worksOrder.contractor_id
      });

    if (insuranceError) {
      return NextResponse.json({ error: 'Failed to check contractor insurance' }, { status: 500 });
    }

    if (!insuranceValid) {
      return NextResponse.json({ 
        error: 'Contractor insurance is not valid or has expired',
        details: {
          contractor_id: worksOrder.contractor_id,
          contractor_name: worksOrder.contractors.name,
          action_required: 'Please upload valid insurance document before approving works order'
        }
      }, { status: 422 });
    }

    // Update works order status
    const { error: updateError } = await supabase
      .from('works_orders')
      .update({
        status: 'issued',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', validatedData.wo_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to approve works order' }, { status: 500 });
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
      message: 'Works order approved and issued successfully',
      works_order: updatedWO,
    });

  } catch (error) {
    console.error('Error approving works order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}




