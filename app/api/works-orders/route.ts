import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const status = searchParams.get('status');
    const contractorId = searchParams.get('contractorId');

    // Build query
    let query = supabase
      .from('works_orders')
      .select(`
        *,
        works_order_lines (
          id,
          line_number,
          description,
          quantity,
          unit_price,
          line_total
        ),
        contractors!inner (
          id,
          company_name,
          contact_name,
          phone,
          email
        ),
        buildings!inner (
          id,
          name,
          address
        )
      `)
      .order('created_at', { ascending: false });

    if (buildingId) {
      query = query.eq('building_id', buildingId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (contractorId) {
      query = query.eq('contractor_id', contractorId);
    }

    const { data: worksOrders, error } = await query;

    if (error) {
      console.error('Error fetching works orders:', error);
      return NextResponse.json({
        error: 'Failed to fetch works orders',
        message: error.message
      }, { status: 500 });
    }

    // Add contractor compliance status
    const worksOrdersWithCompliance = await Promise.all(
      (worksOrders || []).map(async (order) => {
        if (order.contractor_id) {
          const { data: compliance } = await supabase
            .rpc('check_contractor_compliance', { contractor_uuid: order.contractor_id });
          
          return {
            ...order,
            contractor_compliance: compliance?.[0] || { is_compliant: false, missing_requirements: [], expired_documents: [] }
          };
        }
        return order;
      })
    );

    return NextResponse.json({
      success: true,
      works_orders: worksOrdersWithCompliance
    });

  } catch (error) {
    console.error('Error in works orders GET:', error);
    return NextResponse.json({
      error: 'Failed to fetch works orders',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const {
      building_id,
      title,
      description,
      contractor_id,
      priority,
      target_completion_date,
      start_date,
      works_order_lines
    } = body;

    // Validate required fields
    if (!building_id || !title || !works_order_lines?.length) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'building_id, title, and works_order_lines are required'
      }, { status: 400 });
    }

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Generate works order number
    const { data: lastOrder } = await supabase
      .from('works_orders')
      .select('works_order_number')
      .like('works_order_number', 'WO-%')
      .order('works_order_number', { ascending: false })
      .limit(1)
      .single();

    const lastNumber = lastOrder?.works_order_number?.split('-')[1] || '0000';
    const newNumber = `WO-${String(parseInt(lastNumber) + 1).padStart(4, '0')}`;

    // Check contractor compliance if contractor is specified
    if (contractor_id) {
      const { data: compliance } = await supabase
        .rpc('check_contractor_compliance', { contractor_uuid: contractor_id });
      
      if (compliance && compliance[0] && !compliance[0].is_compliant) {
        return NextResponse.json({
          error: 'Contractor compliance issue',
          message: 'Cannot create works order with non-compliant contractor',
          compliance_issues: compliance[0]
        }, { status: 400 });
      }
    }

    // Calculate estimated cost
    const estimatedCost = works_order_lines.reduce((sum: number, line: any) => 
      sum + ((line.quantity || 1) * (line.unit_price || 0)), 0
    );

    // Create works order
    const { data: worksOrder, error: worksOrderError } = await supabase
      .from('works_orders')
      .insert({
        works_order_number: newNumber,
        building_id,
        title,
        description,
        contractor_id,
        priority: priority || 'medium',
        target_completion_date,
        start_date,
        estimated_cost: estimatedCost,
        created_by: session.user.id
      })
      .select()
      .single();

    if (worksOrderError) {
      console.error('Error creating works order:', worksOrderError);
      return NextResponse.json({
        error: 'Failed to create works order',
        message: worksOrderError.message
      }, { status: 500 });
    }

    // Create works order lines
    const worksOrderLineInserts = works_order_lines.map((line: any, index: number) => ({
      works_order_id: worksOrder.id,
      line_number: index + 1,
      description: line.description,
      quantity: line.quantity || 1,
      unit_price: line.unit_price || 0,
      line_total: (line.quantity || 1) * (line.unit_price || 0),
      account_id: line.account_id
    }));

    const { error: linesError } = await supabase
      .from('works_order_lines')
      .insert(worksOrderLineInserts);

    if (linesError) {
      console.error('Error creating works order lines:', linesError);
      // Clean up the works order if lines fail
      await supabase.from('works_orders').delete().eq('id', worksOrder.id);
      return NextResponse.json({
        error: 'Failed to create works order lines',
        message: linesError.message
      }, { status: 500 });
    }

    // Create initial approval if required
    const { error: approvalError } = await supabase
      .from('works_order_approvals')
      .insert({
        works_order_id: worksOrder.id,
        approval_type: 'issue',
        required_approver_role: 'manager',
        status: 'pending'
      });

    if (approvalError) {
      console.error('Error creating initial approval:', approvalError);
      // Continue anyway as this is not critical
    }

    return NextResponse.json({
      success: true,
      message: 'Works order created successfully',
      works_order: worksOrder
    });

  } catch (error) {
    console.error('Error in works orders POST:', error);
    return NextResponse.json({
      error: 'Failed to create works order',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
