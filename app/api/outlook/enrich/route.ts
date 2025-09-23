// app/api/outlook/enrich/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export interface EnrichmentRequest {
  senderEmail: string;
  subject: string;
  bodyPreview: string;
  conversationId?: string;
}

export interface EnrichmentResult {
  residentName: string | null;
  unitLabel: string | null;
  building: { id: string; name: string } | null;
  facts: {
    fraLast?: string | null;
    fraNext?: string | null;
    fireDoorLast?: string | null;
    alarmServiceLast?: string | null;
    eicrLast?: string | null;
    eicrNext?: string | null;
    gasLast?: string | null;
    gasNext?: string | null;
    asbestosLast?: string | null;
    asbestosNext?: string | null;
    openLeakTicketRef?: string | null;
    emergencyContact?: string | null;
  };
  topic: 'leak' | 'fire' | 'compliance' | 'general';
}

export async function POST(request: NextRequest) {
  try {
    const body: EnrichmentRequest = await request.json();
    const { senderEmail, subject, bodyPreview } = body;

    if (!senderEmail) {
      return NextResponse.json({
        success: false,
        error: 'Sender email is required'
      }, { status: 400 });
    }

    // Use service role for server-side data access
    const supabase = await createClient();

    // Step 1: Resolve resident -> unit -> building
    let residentName: string | null = null;
    let unitLabel: string | null = null;
    let building: { id: string; name: string } | null = null;

    try {
      // Find leaseholder by email
      const { data: leaseholders } = await supabase
        .from('leaseholders')
        .select(`
          first_name,
          last_name,
          units (
            id,
            unit_number,
            buildings (
              id,
              name
            )
          )
        `)
        .eq('email', senderEmail.toLowerCase())
        .limit(1);

      if (leaseholders && leaseholders.length > 0) {
        const leaseholder = leaseholders[0];
        residentName = `${leaseholder.first_name || ''} ${leaseholder.last_name || ''}`.trim() || null;

        if (leaseholder.units && leaseholder.units.length > 0) {
          const unit = leaseholder.units[0];
          unitLabel = unit.unit_number;

          if (unit.buildings) {
            building = {
              id: unit.buildings.id,
              name: unit.buildings.name
            };
          }
        }
      }
    } catch (error) {
      console.warn('Error resolving resident/unit/building:', error);
    }

    // Step 2: Determine topic from content
    const topic = detectTopic(subject, bodyPreview);

    // Step 3: Pull relevant facts based on topic and building
    const facts: EnrichmentResult['facts'] = {};

    if (building) {
      try {
        switch (topic) {
          case 'leak':
            await enrichLeakFacts(supabase, building.id, facts);
            break;
          case 'fire':
            await enrichFireFacts(supabase, building.id, facts);
            break;
          case 'compliance':
            await enrichComplianceFacts(supabase, building.id, facts);
            break;
          default:
            // For general topics, get basic building info
            await enrichGeneralFacts(supabase, building.id, facts);
            break;
        }
      } catch (error) {
        console.warn('Error enriching facts:', error);
      }
    }

    const result: EnrichmentResult = {
      residentName,
      unitLabel,
      building,
      facts,
      topic
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in enrichment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to enrich context'
    }, { status: 500 });
  }
}

function detectTopic(subject: string, bodyPreview: string): 'leak' | 'fire' | 'compliance' | 'general' {
  const content = `${subject} ${bodyPreview}`.toLowerCase();

  // Leak/water-related keywords
  const leakKeywords = ['leak', 'water', 'ingress', 'damp', 'flooding', 'pipe', 'plumbing', 'drip', 'wet'];
  if (leakKeywords.some(keyword => content.includes(keyword))) {
    return 'leak';
  }

  // Fire safety keywords
  const fireKeywords = ['fire', 'door', 'alarm', 'smoke', 'fra', 'fire risk assessment', 'fire safety', 'emergency exit'];
  if (fireKeywords.some(keyword => content.includes(keyword))) {
    return 'fire';
  }

  // Compliance keywords
  const complianceKeywords = ['eicr', 'electrical', 'gas', 'asbestos', 'compliance', 'certificate', 'inspection', 'test'];
  if (complianceKeywords.some(keyword => content.includes(keyword))) {
    return 'compliance';
  }

  return 'general';
}

async function enrichLeakFacts(supabase: any, buildingId: string, facts: EnrichmentResult['facts']) {
  // Get last leak ticket
  try {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('reference, created_at')
      .eq('building_id', buildingId)
      .ilike('title', '%leak%')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1);

    if (tickets && tickets.length > 0) {
      facts.openLeakTicketRef = tickets[0].reference;
    }
  } catch (error) {
    console.warn('Error fetching leak tickets:', error);
  }

  // Get emergency contact
  try {
    const { data: building } = await supabase
      .from('buildings')
      .select('emergency_contact')
      .eq('id', buildingId)
      .single();

    if (building?.emergency_contact) {
      facts.emergencyContact = building.emergency_contact;
    }
  } catch (error) {
    console.warn('Error fetching emergency contact:', error);
  }
}

async function enrichFireFacts(supabase: any, buildingId: string, facts: EnrichmentResult['facts']) {
  try {
    const { data: compliance } = await supabase
      .from('building_compliance_assets')
      .select('asset_type, last_inspection_date, next_inspection_date')
      .eq('building_id', buildingId)
      .in('asset_type', ['fire_risk_assessment', 'fire_door', 'fire_alarm'])
      .order('last_inspection_date', { ascending: false });

    if (compliance) {
      compliance.forEach(item => {
        switch (item.asset_type) {
          case 'fire_risk_assessment':
            facts.fraLast = item.last_inspection_date;
            facts.fraNext = item.next_inspection_date;
            break;
          case 'fire_door':
            facts.fireDoorLast = item.last_inspection_date;
            break;
          case 'fire_alarm':
            facts.alarmServiceLast = item.last_inspection_date;
            break;
        }
      });
    }
  } catch (error) {
    console.warn('Error fetching fire compliance:', error);
  }
}

async function enrichComplianceFacts(supabase: any, buildingId: string, facts: EnrichmentResult['facts']) {
  try {
    const { data: compliance } = await supabase
      .from('building_compliance_assets')
      .select('asset_type, last_inspection_date, next_inspection_date')
      .eq('building_id', buildingId)
      .in('asset_type', ['eicr', 'gas_safety', 'asbestos'])
      .order('last_inspection_date', { ascending: false });

    if (compliance) {
      compliance.forEach(item => {
        switch (item.asset_type) {
          case 'eicr':
            facts.eicrLast = item.last_inspection_date;
            facts.eicrNext = item.next_inspection_date;
            break;
          case 'gas_safety':
            facts.gasLast = item.last_inspection_date;
            facts.gasNext = item.next_inspection_date;
            break;
          case 'asbestos':
            facts.asbestosLast = item.last_inspection_date;
            break;
        }
      });
    }
  } catch (error) {
    console.warn('Error fetching compliance assets:', error);
  }
}

async function enrichGeneralFacts(supabase: any, buildingId: string, facts: EnrichmentResult['facts']) {
  // For general inquiries, get basic emergency info
  try {
    const { data: building } = await supabase
      .from('buildings')
      .select('emergency_contact')
      .eq('id', buildingId)
      .single();

    if (building?.emergency_contact) {
      facts.emergencyContact = building.emergency_contact;
    }
  } catch (error) {
    console.warn('Error fetching general facts:', error);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}