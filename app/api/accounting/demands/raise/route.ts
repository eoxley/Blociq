import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const RaiseDemandSchema = z.object({
  building_id: z.string().uuid(),
  schedule_id: z.string().uuid(),
  period_start: z.string(),
  period_end: z.string(),
  strategy: z.enum(['budget', 'fixed']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = RaiseDemandSchema.parse(body);
    
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

    // Get schedule apportionments
    const { data: apportionments, error: apportionError } = await supabase
      .from('schedule_apportionments')
      .select(`
        *,
        units (*)
      `)
      .eq('schedule_id', validatedData.schedule_id);

    if (apportionError) {
      return NextResponse.json({ error: 'Failed to fetch apportionments' }, { status: 500 });
    }

    if (!apportionments || apportionments.length === 0) {
      return NextResponse.json({ error: 'No apportionments found for schedule' }, { status: 400 });
    }

    // Get budget or fixed amounts based on strategy
    let demandLines: Array<{ account_id: string; amount: number; narrative: string }> = [];

    if (validatedData.strategy === 'budget') {
      // Get budget lines for the period
      const { data: budgetLines, error: budgetError } = await supabase
        .from('budget_lines')
        .select(`
          *,
          budget_versions!inner (
            building_id,
            year
          )
        `)
        .eq('budget_versions.building_id', validatedData.building_id)
        .eq('budget_versions.year', new Date(validatedData.period_start).getFullYear());

      if (budgetError) {
        return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 });
      }

      demandLines = budgetLines?.map(line => ({
        account_id: line.account_id,
        amount: line.amount,
        narrative: line.narrative || `Budget allocation for ${line.account_id}`,
      })) || [];
    } else {
      // Fixed strategy - use predefined amounts
      // This would typically come from a configuration or previous period
      const { data: lastDemand, error: lastDemandError } = await supabase
        .from('ar_demand_headers')
        .select(`
          ar_demand_lines (*)
        `)
        .eq('building_id', validatedData.building_id)
        .eq('schedule_id', validatedData.schedule_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastDemandError || !lastDemand) {
        return NextResponse.json({ error: 'No previous demand found for fixed strategy' }, { status: 400 });
      }

      demandLines = lastDemand.ar_demand_lines.map((line: any) => ({
        account_id: line.account_id,
        amount: line.amount,
        narrative: line.narrative,
      }));
    }

    if (demandLines.length === 0) {
      return NextResponse.json({ error: 'No demand lines to create' }, { status: 400 });
    }

    // Create demand headers for each unit
    const demandHeaders = [];
    
    for (const apportionment of apportionments) {
      const totalAmount = demandLines.reduce((sum, line) => {
        let unitAmount = line.amount;
        
        // Apply apportionment
        if (apportionment.method === 'percent') {
          unitAmount = line.amount * (apportionment.share / 100);
        } else if (apportionment.method === 'weight') {
          // Calculate total weight first
          const totalWeight = apportionments.reduce((sum, a) => sum + a.share, 0);
          unitAmount = line.amount * (apportionment.share / totalWeight);
        } else if (apportionment.method === 'fixed') {
          unitAmount = apportionment.share;
        }

        // Apply cap and floor
        if (apportionment.cap && unitAmount > apportionment.cap) {
          unitAmount = apportionment.cap;
        }
        if (apportionment.floor && unitAmount < apportionment.floor) {
          unitAmount = apportionment.floor;
        }

        return sum + unitAmount;
      }, 0);

      // Create demand header
      const { data: header, error: headerError } = await supabase
        .from('ar_demand_headers')
        .insert({
          building_id: validatedData.building_id,
          schedule_id: validatedData.schedule_id,
          unit_id: apportionment.unit_id,
          period_start: validatedData.period_start,
          period_end: validatedData.period_end,
          total: totalAmount,
          status: 'draft',
        })
        .select()
        .single();

      if (headerError) {
        return NextResponse.json({ error: 'Failed to create demand header' }, { status: 500 });
      }

      // Create demand lines for this unit
      const unitDemandLines = demandLines.map(line => {
        let unitAmount = line.amount;
        
        // Apply apportionment
        if (apportionment.method === 'percent') {
          unitAmount = line.amount * (apportionment.share / 100);
        } else if (apportionment.method === 'weight') {
          const totalWeight = apportionments.reduce((sum, a) => sum + a.share, 0);
          unitAmount = line.amount * (apportionment.share / totalWeight);
        } else if (apportionment.method === 'fixed') {
          unitAmount = apportionment.share;
        }

        // Apply cap and floor
        if (apportionment.cap && unitAmount > apportionment.cap) {
          unitAmount = apportionment.cap;
        }
        if (apportionment.floor && unitAmount < apportionment.floor) {
          unitAmount = apportionment.floor;
        }

        return {
          header_id: header.id,
          account_id: line.account_id,
          amount: unitAmount,
          narrative: line.narrative,
        };
      });

      const { error: linesError } = await supabase
        .from('ar_demand_lines')
        .insert(unitDemandLines);

      if (linesError) {
        return NextResponse.json({ error: 'Failed to create demand lines' }, { status: 500 });
      }

      demandHeaders.push(header);
    }

    return NextResponse.json({
      success: true,
      demand_headers: demandHeaders,
      count: demandHeaders.length,
    });

  } catch (error) {
    console.error('Error raising demands:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
