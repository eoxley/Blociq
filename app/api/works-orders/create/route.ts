import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CreateWorksOrderSchema = z.object({
  building_id: z.string().uuid(),
  schedule_id: z.string().uuid().optional(),
  contractor_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  target_date: z.string().optional(),
  lines: z.array(z.object({
    account_id: z.string().uuid(),
    description: z.string().min(1),
    quantity: z.number().min(0.01),
    unit_cost: z.number().min(0),
  })).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateWorksOrderSchema.parse(body);
    
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

    // Verify contractor exists
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id, name')
      .eq('id', validatedData.contractor_id)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Generate works order reference
    const { data: woRef, error: refError } = await supabase
      .rpc('generate_wo_ref', {
        building_uuid: validatedData.building_id
      });

    if (refError) {
      return NextResponse.json({ error: 'Failed to generate works order reference' }, { status: 500 });
    }

    // Create works order
    const { data: worksOrder, error: woError } = await supabase
      .from('works_orders')
      .insert({
        building_id: validatedData.building_id,
        schedule_id: validatedData.schedule_id,
        contractor_id: validatedData.contractor_id,
        raised_by: user.id,
        ref: woRef,
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority,
        target_date: validatedData.target_date,
      })
      .select()
      .single();

    if (woError) {
      return NextResponse.json({ error: 'Failed to create works order' }, { status: 500 });
    }

    // Create works order lines
    const lines = validatedData.lines.map(line => ({
      wo_id: worksOrder.id,
      account_id: line.account_id,
      description: line.description,
      quantity: line.quantity,
      unit_cost: line.unit_cost,
    }));

    const { data: createdLines, error: linesError } = await supabase
      .from('works_order_lines')
      .insert(lines)
      .select();

    if (linesError) {
      // Rollback works order if lines fail
      await supabase
        .from('works_orders')
        .delete()
        .eq('id', worksOrder.id);
      
      return NextResponse.json({ error: 'Failed to create works order lines' }, { status: 500 });
    }

    // Get complete works order with lines
    const { data: completeWO, error: fetchError } = await supabase
      .from('works_orders')
      .select(`
        *,
        works_order_lines (*),
        contractors (name),
        buildings (name)
      `)
      .eq('id', worksOrder.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch works order details' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      works_order: completeWO,
    });

  } catch (error) {
    console.error('Error creating works order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}




