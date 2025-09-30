import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('ar_demand_headers')
      .select(`
        *,
        ar_demand_lines (
          id,
          line_number,
          description,
          amount
        ),
        leaseholders!inner (
          id,
          full_name,
          units!inner (
            unit_number,
            buildings!inner (
              id,
              name,
              address
            )
          )
        )
      `)
      .order('demand_date', { ascending: false });

    if (buildingId) {
      query = query.eq('building_id', buildingId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: demands, error } = await query;

    if (error) {
      console.error('Error fetching demands:', error);
      return NextResponse.json({
        error: 'Failed to fetch demands',
        message: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      demands: demands || []
    });

  } catch (error) {
    console.error('Error in demands GET:', error);
    return NextResponse.json({
      error: 'Failed to fetch demands',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const {
      buildingId,
      leaseholderIds,
      demandType,
      description,
      dueDate,
      periodStart,
      periodEnd,
      demandLines
    } = body;

    // Validate required fields
    if (!buildingId || !leaseholderIds?.length || !demandType || !demandLines?.length) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'buildingId, leaseholderIds, demandType, and demandLines are required'
      }, { status: 400 });
    }

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const demands = [];

    // Create demands for each leaseholder
    for (const leaseholderId of leaseholderIds) {
      // Generate demand number
      const { data: lastDemand } = await supabase
        .from('ar_demand_headers')
        .select('demand_number')
        .like('demand_number', `DEM-${new Date().getFullYear()}-%`)
        .order('demand_number', { ascending: false })
        .limit(1)
        .single();

      const lastNumber = lastDemand?.demand_number?.split('-')[2] || '0000';
      const newNumber = `DEM-${new Date().getFullYear()}-${String(parseInt(lastNumber) + 1).padStart(4, '0')}`;

      // Calculate total amount
      const totalAmount = demandLines.reduce((sum: number, line: any) => sum + (line.amount || 0), 0);

      // Create demand header
      const { data: demandHeader, error: headerError } = await supabase
        .from('ar_demand_headers')
        .insert({
          demand_number: newNumber,
          building_id: buildingId,
          leaseholder_id: leaseholderId,
          demand_type: demandType,
          description: description,
          due_date: dueDate,
          period_start: periodStart,
          period_end: periodEnd,
          total_amount: totalAmount,
          outstanding_amount: totalAmount,
          created_by: session.user.id
        })
        .select()
        .single();

      if (headerError) {
        console.error('Error creating demand header:', headerError);
        return NextResponse.json({
          error: 'Failed to create demand',
          message: headerError.message
        }, { status: 500 });
      }

      // Create demand lines
      const demandLineInserts = demandLines.map((line: any, index: number) => ({
        demand_header_id: demandHeader.id,
        line_number: index + 1,
        description: line.description,
        amount: line.amount,
        account_id: line.accountId
      }));

      const { error: linesError } = await supabase
        .from('ar_demand_lines')
        .insert(demandLineInserts);

      if (linesError) {
        console.error('Error creating demand lines:', linesError);
        // Clean up the header if lines fail
        await supabase.from('ar_demand_headers').delete().eq('id', demandHeader.id);
        return NextResponse.json({
          error: 'Failed to create demand lines',
          message: linesError.message
        }, { status: 500 });
      }

      demands.push(demandHeader);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${demands.length} demands successfully`,
      demands: demands
    });

  } catch (error) {
    console.error('Error in demands POST:', error);
    return NextResponse.json({
      error: 'Failed to create demands',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
