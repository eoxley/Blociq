/**
 * API route for enriching email context with building and compliance data
 * Input: sender email, building hint, topic hint, message summary
 * Output: resident info, building info, relevant compliance facts
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/serverSupabase';
import {
  EnrichRequestSchema,
  EnrichResponse,
  Enrichment,
  TopicHint
} from '@/lib/outlook/reply-types';
import { detectTopic } from '@/lib/outlook/reply-utils';

export async function POST(req: NextRequest): Promise<NextResponse<EnrichResponse | { error: string }>> {
  try {
    const body = EnrichRequestSchema.parse(await req.json());
    const sb = serverSupabase();

    // Detect topic if not provided
    const topic = body.topicHint || detectTopic(body.messageSummary);

    // 1. Look up leaseholder by email
    const { data: leaseholder, error: lhError } = await sb
      .from('leaseholders')
      .select(`
        id,
        email,
        first_name,
        last_name,
        unit_id,
        units!inner (
          id,
          unit_number,
          building_id,
          buildings!inner (
            id,
            name,
            address
          )
        )
      `)
      .eq('email', body.senderEmail)
      .single();

    if (lhError && lhError.code !== 'PGRST116') {
      console.error('Error fetching leaseholder:', lhError);
    }

    // Extract basic info
    let residentName: string | null = null;
    let unitLabel: string | null = null;
    let buildingName: string | null = null;
    let buildingId: string | null = null;
    let unitId: string | null = null;

    if (leaseholder) {
      const firstName = leaseholder.first_name;
      const lastName = leaseholder.last_name;
      residentName = [firstName, lastName].filter(Boolean).join(' ') || null;

      if (leaseholder.units) {
        const unit = Array.isArray(leaseholder.units) ? leaseholder.units[0] : leaseholder.units;
        unitLabel = unit.unit_number;
        unitId = unit.id;
        buildingId = unit.building_id;

        if (unit.buildings) {
          const building = Array.isArray(unit.buildings) ? unit.buildings[0] : unit.buildings;
          buildingName = building.name;
        }
      }
    }

    // 2. If no leaseholder found but building hint provided, try to resolve building
    if (!buildingId && body.buildingHint) {
      const { data: buildings } = await sb
        .from('buildings')
        .select('id, name, address')
        .or(`name.ilike.%${body.buildingHint}%,address.ilike.%${body.buildingHint}%`)
        .limit(1);

      if (buildings && buildings.length > 0) {
        buildingId = buildings[0].id;
        buildingName = buildings[0].name;
      }
    }

    // 3. Fetch relevant compliance data based on topic
    const facts = await fetchRelevantFacts(sb, topic, buildingId, unitId);

    const enrichment: Enrichment = {
      residentName,
      unitLabel,
      buildingName,
      facts
    };

    return NextResponse.json({ enrichment }, { status: 200 });

  } catch (error: unknown) {
    console.error('Enrich API error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to enrich email context' },
      { status: 400 }
    );
  }
}

/**
 * Fetch relevant facts based on topic and building/unit context
 */
async function fetchRelevantFacts(
  sb: ReturnType<typeof serverSupabase>,
  topic: TopicHint,
  buildingId: string | null,
  unitId: string | null
) {
  const facts: Enrichment['facts'] = {};

  if (!buildingId) {
    return facts; // No building context, return empty facts
  }

  try {
    // Always fetch core compliance data
    const { data: assets } = await sb
      .from('building_compliance_assets')
      .select('*')
      .eq('building_id', buildingId);

    if (assets) {
      // Map compliance assets to facts
      for (const asset of assets) {
        const assetType = asset.asset_type?.toLowerCase();

        if (assetType?.includes('fire risk') || assetType?.includes('fra')) {
          facts.fraLast = asset.last_inspection_date;
          facts.fraNext = asset.next_inspection_date;
        }

        if (assetType?.includes('fire door')) {
          facts.fireDoorInspectLast = asset.last_inspection_date;
        }

        if (assetType?.includes('alarm') || assetType?.includes('fire alarm')) {
          facts.alarmServiceLast = asset.last_inspection_date;
        }

        if (assetType?.includes('eicr') || assetType?.includes('electrical')) {
          facts.eicrLast = asset.last_inspection_date;
          facts.eicrNext = asset.next_inspection_date;
        }

        if (assetType?.includes('gas')) {
          facts.gasLast = asset.last_inspection_date;
          facts.gasNext = asset.next_inspection_date;
        }

        if (assetType?.includes('asbestos')) {
          facts.asbestosLast = asset.last_inspection_date;
          facts.asbestosNext = asset.next_inspection_date;
        }
      }
    }

    // Topic-specific data fetching
    if (topic === 'leak') {
      // Fetch open leak-related tickets
      const { data: tickets } = await sb
        .from('tickets')
        .select('reference, description, status')
        .eq('building_id', buildingId)
        .in('status', ['open', 'in_progress', 'assigned'])
        .or('category.ilike.%leak%,description.ilike.%leak%,description.ilike.%water%,description.ilike.%ingress%')
        .order('created_at', { ascending: false })
        .limit(1);

      if (tickets && tickets.length > 0) {
        facts.openLeakTicketRef = tickets[0].reference;
      }

      // Also check work orders
      const { data: workOrders } = await sb
        .from('work_orders')
        .select('reference, description, status')
        .eq('building_id', buildingId)
        .in('status', ['open', 'in_progress', 'assigned'])
        .or('type.ilike.%leak%,description.ilike.%leak%,description.ilike.%water%,description.ilike.%ingress%')
        .order('created_at', { ascending: false })
        .limit(1);

      if (workOrders && workOrders.length > 0) {
        facts.openWorkOrderRef = workOrders[0].reference;
      }
    }

    // For unit-specific issues, check unit-level work orders/tickets
    if (unitId && (topic === 'leak' || topic === 'general')) {
      const { data: unitWorkOrders } = await sb
        .from('work_orders')
        .select('reference, description, status')
        .eq('unit_id', unitId)
        .in('status', ['open', 'in_progress', 'assigned'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (unitWorkOrders && unitWorkOrders.length > 0 && !facts.openWorkOrderRef) {
        facts.openWorkOrderRef = unitWorkOrders[0].reference;
      }
    }

  } catch (error) {
    console.error('Error fetching compliance facts:', error);
    // Continue with empty facts if there's an error
  }

  return facts;
}